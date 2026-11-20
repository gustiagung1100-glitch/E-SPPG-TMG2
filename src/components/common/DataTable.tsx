import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download, Printer } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
  actions?: React.ReactNode;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onPrint?: () => void;
  filters?: React.ReactNode;
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  stickyFirstColumn?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Cari data...',
  searchKeys = [],
  itemsPerPageOptions = [10, 20, 50],
  defaultItemsPerPage = 10,
  actions,
  onExportExcel,
  onExportPDF,
  onPrint,
  filters,
  title,
  subtitle,
  isLoading = false,
  stickyFirstColumn = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase();

    return data.filter(item => {
      if (searchKeys.length > 0) {
        return searchKeys.some(key => {
          const val = item[key];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
        });
      }
      return Object.values(item).some(val => {
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
      });
    });
  }, [data, searchTerm, searchKeys]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDirection === 'asc'
        ? strA.localeCompare(strB, 'id-ID')
        : strB.localeCompare(strA, 'id-ID');
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden print:overflow-visible print:shadow-none print:border-slate-300 transition-all duration-200">
      {/* Top Card Title & Single-Row Inline Search + Export Toolbar */}
      <div className="p-5 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 print:p-2 print:border-slate-300 space-y-4">
        {(title || subtitle) && (
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Search Input Inline with Filters & Export Buttons (Excel / PDF / Cetak) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-1 max-w-md min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-800 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                  title="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            {filters && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {filters}
              </div>
            )}
          </div>

          {/* Action & Export Buttons aligned cleanly on the right */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-2 text-xs font-semibold text-[#0D9488] bg-teal-50 hover:bg-teal-100 border border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/70 dark:hover:bg-teal-900/60 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                title="Ekspor ke Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            )}
            {onExportPDF && (
              <button
                type="button"
                onClick={onExportPDF}
                className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-2 text-xs font-semibold text-[#E11D48] bg-rose-50 hover:bg-rose-100 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70 dark:hover:bg-rose-900/60 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                title="Ekspor ke PDF resmi"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-700 rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                title="Cetak dokumen"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Horizontal Scroll Indicator for Mobile / Tablet */}
      {columns.length >= 4 && (
        <div className="lg:hidden px-4 py-1.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 print:hidden">
          <span>Geser tabel ke samping untuk melihat seluruh kolom</span>
          <span className="font-semibold text-[#1E3A8A] dark:text-sky-400">↔ Scroll</span>
        </div>
      )}

      {/* Table Element */}
      <div className="overflow-x-auto max-h-[calc(100vh-22rem)] scrollbar-thin print:max-h-none print:overflow-visible">
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 uppercase font-bold text-[11px] tracking-wider">
            <tr>
              <th
                className={`py-3.5 px-4 w-12 text-center text-slate-600 dark:text-slate-300 ${
                  stickyFirstColumn ? 'sticky left-0 z-20 bg-slate-50 dark:bg-slate-800' : ''
                }`}
              >
                #
              </th>
              {columns.map((col, colIdx) => {
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';
                const stickyColClass =
                  stickyFirstColumn && colIdx === 0
                    ? 'sticky left-12 z-20 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]'
                    : '';

                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`py-3.5 px-4 whitespace-nowrap ${alignClass} ${stickyColClass} ${
                      col.sortable !== false
                        ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/70 select-none transition-colors'
                        : ''
                    } ${col.className || ''}`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-slate-400">
                          {sortKey === col.key ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-sky-400 font-bold" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-sky-400 font-bold" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-80" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, sIdx) => (
                <tr key={`skel-${sIdx}`} aria-hidden="true">
                  <td className="py-4 px-4 text-center">
                    <div className="h-3.5 w-6 mx-auto rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  </td>
                  {columns.map(col => (
                    <td key={`${sIdx}-${col.key}`} className="py-4 px-4">
                      <div className="h-4 w-full max-w-[160px] rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    Tidak ada data yang sesuai.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const rowNumber = startIndex + idx + 1;
                return (
                  <tr
                    key={keyExtractor(row)}
                    className="group hover:bg-blue-50/45 dark:hover:bg-slate-800/40 transition-colors text-slate-700 dark:text-slate-200"
                  >
                    <td
                      className={`py-4 px-4 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px] align-top ${
                        stickyFirstColumn ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50/90 dark:bg-slate-900 dark:group-hover:bg-slate-800' : ''
                      }`}
                    >
                      {rowNumber}
                    </td>
                    {columns.map((col, colIdx) => {
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left';
                      const stickyBodyClass =
                        stickyFirstColumn && colIdx === 0
                          ? 'sticky left-12 z-10 bg-white group-hover:bg-blue-50/90 dark:bg-slate-900 dark:group-hover:bg-slate-800 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.08)]'
                          : '';

                      return (
                        <td
                          key={col.key}
                          className={`py-4 px-4 align-middle ${alignClass} ${stickyBodyClass} ${col.className || ''}`}
                        >
                          {col.render ? col.render(row) : (row[col.key] ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 print:hidden">
        <div className="flex items-center gap-3">
          <span>
            Menampilkan {totalItems === 0 ? 0 : startIndex + 1} -{' '}
            {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} entri
          </span>
          <div className="flex items-center gap-1.5">
            <span>Baris:</span>
            <select
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#F4F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md py-1 px-2 text-[#1F2937] dark:text-slate-200 focus:outline-hidden"
            >
              {itemsPerPageOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded-md border border-[#E2E8F0] dark:border-slate-700 hover:bg-[#F4F7FA] dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-semibold text-[#1F2937] dark:text-slate-200">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-md border border-[#E2E8F0] dark:border-slate-700 hover:bg-[#F4F7FA] dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
