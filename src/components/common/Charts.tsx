import React, { useState } from 'react';
import { formatNumber, formatRupiah } from '../../lib/exportUtils';

interface BarChartProps {
  data: { label: string; value: number; secondaryValue?: number; color?: string }[];
  title?: string;
  subtitle?: string;
  height?: number;
  valueFormatter?: (val: number) => string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  title,
  subtitle,
  height = 220,
  valueFormatter = formatNumber,
  primaryLabel = 'Nilai',
  secondaryLabel,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.value, d.secondaryValue || 0)),
    10
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between">
      {(title || subtitle) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && (
              <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
                {title}
              </h4>
            )}
            {subtitle && (
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {(primaryLabel || secondaryLabel) && (
            <div className="flex items-center gap-3 text-xs text-[#64748B] dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#142B4A] dark:bg-teal-500" />
                {primaryLabel}
              </span>
              {secondaryLabel && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-teal-300" />
                  {secondaryLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart Canvas */}
      <div className="relative flex items-end justify-between gap-2 pt-6 pb-2" style={{ height: `${height}px` }}>
        {data.map((item, idx) => {
          const primaryHeightPct = Math.round((item.value / maxValue) * 100);
          const secondaryHeightPct = item.secondaryValue
            ? Math.round((item.secondaryValue / maxValue) * 100)
            : 0;

          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-12 z-20 bg-[#142B4A]/95 dark:bg-slate-800/95 backdrop-blur-xs text-white text-[11px] py-1.5 px-3 rounded-lg shadow-xl border border-white/10 whitespace-nowrap pointer-events-none tabular-nums animate-in fade-in zoom-in-95 duration-100">
                  <div className="font-bold text-[#F2D58B]">{item.label}</div>
                  <div className="text-slate-100">
                    {primaryLabel}: {valueFormatter(item.value)}
                  </div>
                  {item.secondaryValue !== undefined && secondaryLabel && (
                    <div className="text-teal-300">
                      {secondaryLabel}: {valueFormatter(item.secondaryValue)}
                    </div>
                  )}
                </div>
              )}

              {/* Bars */}
              <div className="w-full flex items-end justify-center gap-1 h-full">
                {/* Primary Bar */}
                <div
                  className="w-full max-w-[28px] rounded-t-md transition-all duration-300 relative bg-[#142B4A] hover:bg-[#102D63] dark:bg-teal-500 dark:hover:bg-teal-400"
                  style={{
                    height: `${Math.max(primaryHeightPct, 4)}%`,
                    backgroundColor: item.color,
                  }}
                />

                {/* Secondary Bar if exists */}
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-full max-w-[28px] rounded-t-md transition-all duration-300 bg-[#0F766E] hover:bg-teal-600 dark:bg-teal-300"
                    style={{ height: `${Math.max(secondaryHeightPct, 4)}%` }}
                  />
                )}
              </div>

              {/* Label below */}
              <span className="text-[10px] text-[#64748B] dark:text-slate-400 mt-2 truncate w-full text-center group-hover:text-[#1F2937] dark:group-hover:text-white transition">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface DonutChartProps {
  title: string;
  subtitle?: string;
  data: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  data,
  centerLabel,
  centerValue,
}) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0) || 1;
  let accumulatedAngle = 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
          {title}
        </h4>
        {subtitle && (
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 my-2">
        {/* Donut representation */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {data.map((slice, idx) => {
              const strokeDasharray = `${(slice.value / total) * 100} 100`;
              const strokeDashoffset = -accumulatedAngle;
              accumulatedAngle += (slice.value / total) * 100;

              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="18"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && (
              <span className="text-base sm:text-lg font-extrabold text-[#1F2937] dark:text-white leading-none tabular-nums">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] text-[#64748B] dark:text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                {centerLabel}
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 tabular-nums">
          {data.map((item, idx) => {
            const pct = Math.round((item.value / total) * 100);
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-xs shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#1F2937] dark:text-slate-300 font-medium">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1F2937] dark:text-white">
                    {formatNumber(item.value)}
                  </span>
                  <span className="text-[#64748B] text-[11px] font-mono">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface LineChartProps {
  title: string;
  subtitle?: string;
  data: { label: string; actual: number; target: number }[];
  targetLabel?: string;
  actualLabel?: string;
}

export const FoodCostLineChart: React.FC<LineChartProps> = ({
  title,
  subtitle,
  data,
  targetLabel = 'Plafon Pagu BGN',
  actualLabel = 'Realisasi Food Cost',
}) => {
  const targetValue = data[0]?.target || 10000;
  const maxVal = Math.max(...data.map(d => Math.max(d.actual, d.target)), targetValue + 2000);
  const minVal = Math.max(0, Math.min(...data.map(d => Math.min(d.actual, d.target)), targetValue) - 2000);
  const range = Math.max(1, maxVal - minVal);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-[#1F2937] dark:text-white">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-300">
            <span className="w-3 h-0.5 bg-[#0F766E] dark:bg-teal-400" />
            {actualLabel}
          </span>
          <span className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-300">
            <span className="w-3 h-0.5 border-t border-dashed border-[#DC2626]" />
            {targetLabel}
          </span>
        </div>
      </div>

      <div className="h-44 w-full relative pt-4 pb-2">
        {/* Horizontal target threshold line */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-[#DC2626] dark:border-rose-500 z-0 flex items-center justify-end"
          style={{
            top: `${100 - ((targetValue - minVal) / range) * 100}%`,
          }}
        >
          <span className="text-[10px] text-[#DC2626] dark:text-rose-400 bg-white dark:bg-slate-900 px-1 font-mono font-semibold">
            Plafon {formatRupiah(targetValue)}
          </span>
        </div>

        {/* Data points */}
        <div className="h-full flex items-end justify-between relative z-10">
          {data.map((item, idx) => {
            const pct = ((item.actual - minVal) / range) * 100;
            const isUnderBudget = item.actual <= item.target;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm transition group-hover:scale-125 z-10"
                  style={{
                    marginBottom: `${Math.max(pct, 5)}%`,
                    backgroundColor: isUnderBudget ? '#0F766E' : '#DC2626',
                  }}
                />

                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 absolute -top-9 bg-[#142B4A]/95 dark:bg-slate-800/95 backdrop-blur-xs text-white text-[11px] py-1 px-2.5 rounded-lg shadow-xl border border-white/10 pointer-events-none whitespace-nowrap z-20 tabular-nums">
                  <span className="font-bold text-[#F2D58B]">{item.label}</span>: {formatRupiah(item.actual)}
                </div>

                <span className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 mt-2">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export interface StackedDailySegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface StackedDailyBarItem {
  date: string;
  label: string;
  total: number;
  segments: StackedDailySegment[];
  subMeta?: string;
}

interface StackedDailyBarChartProps {
  data: StackedDailyBarItem[];
  legendItems: { key: string; label: string; color: string }[];
  unitLabel?: string;
  height?: number;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  emptyMessage?: string;
}

export const StackedDailyBarChart: React.FC<StackedDailyBarChartProps> = ({
  data,
  legendItems,
  unitLabel = 'kg',
  height = 210,
  selectedDate,
  onSelectDate,
  emptyMessage = 'Belum ada data harian yang tercatat.',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-10 px-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
        <p className="text-xs text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  const rawMax = Math.max(...data.map(d => d.total), 1);
  const niceMax = Math.max(5, Math.ceil(rawMax / 5) * 5);
  const midTick = niceMax / 2;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
        {legendItems.map(item => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </span>
        ))}
      </div>

      {/* Chart Area */}
      <div className="relative pl-10 pr-2 pt-7 pb-1">
        {/* Y-axis gridlines */}
        <div
          className="absolute left-10 right-2 top-7 bottom-7 pointer-events-none flex flex-col justify-between"
          aria-hidden="true"
        >
          <div className="relative border-t border-dashed border-slate-200 dark:border-slate-800">
            <span className="absolute -left-10 -top-2 w-8 text-right text-[10px] font-mono tabular-nums text-slate-400">
              {niceMax} {unitLabel}
            </span>
          </div>
          <div className="relative border-t border-dashed border-slate-200 dark:border-slate-800">
            <span className="absolute -left-10 -top-2 w-8 text-right text-[10px] font-mono tabular-nums text-slate-400">
              {midTick % 1 === 0 ? midTick : midTick.toFixed(1)}
            </span>
          </div>
          <div className="relative border-t border-slate-300 dark:border-slate-700">
            <span className="absolute -left-10 -top-2 w-8 text-right text-[10px] font-mono tabular-nums text-slate-400">
              0
            </span>
          </div>
        </div>

        {/* Bars */}
        <div
          className="relative flex items-end justify-around gap-3 sm:gap-5"
          style={{ height: `${height}px` }}
        >
          {data.map((day, idx) => {
            const totalHeightPct = Math.min(100, (day.total / niceMax) * 100);
            const isHovered = hoveredIdx === idx;
            const isSelected = selectedDate ? selectedDate === day.date : false;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectDate?.(day.date)}
                className={`flex-1 max-w-[84px] h-full flex flex-col items-center justify-end group relative ${
                  onSelectDate ? 'cursor-pointer' : ''
                }`}
              >
                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute -top-4 -translate-y-full z-30 bg-[#142B4A]/95 dark:bg-slate-800/95 backdrop-blur-xs text-white text-[11px] py-2 px-3 rounded-lg shadow-xl border border-white/10 whitespace-nowrap pointer-events-none tabular-nums">
                    <div className="font-bold text-[#F2D58B] mb-1">
                      {day.label} · Total {day.total.toFixed(1)} {unitLabel}
                    </div>
                    <div className="space-y-0.5">
                      {day.segments.map(seg => (
                        <div key={seg.key} className="flex items-center justify-between gap-4 text-[10px]">
                          <span className="inline-flex items-center gap-1.5 text-slate-200">
                            <span
                              className="w-2 h-2 rounded-xs shrink-0"
                              style={{ backgroundColor: seg.color }}
                            />
                            {seg.label}
                          </span>
                          <span className="font-mono font-semibold text-white">
                            {seg.value.toFixed(1)} {unitLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                    {day.subMeta && (
                      <div className="mt-1 pt-1 border-t border-white/15 text-[10px] text-teal-300">
                        {day.subMeta}
                      </div>
                    )}
                  </div>
                )}

                {/* Stacked Bar Column */}
                <div className="w-full flex flex-col items-center justify-end h-[calc(100%-24px)]">
                  <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 mb-1 tabular-nums">
                    {day.total.toFixed(1)}
                  </span>
                  <div
                    className={`w-full max-w-[42px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-[#071D49] dark:ring-sky-400 ring-offset-1 dark:ring-offset-slate-900'
                        : 'group-hover:brightness-105'
                    }`}
                    style={{
                      height: `${Math.max(totalHeightPct, day.total > 0 ? 6 : 2)}%`,
                    }}
                  >
                    {day.segments.map(seg => {
                      const segPct = day.total > 0 ? (seg.value / day.total) * 100 : 0;
                      if (segPct <= 0) return null;
                      return (
                        <div
                          key={seg.key}
                          style={{
                            height: `${segPct}%`,
                            backgroundColor: seg.color,
                          }}
                          className="w-full transition-all duration-300 border-b border-white/25 last:border-b-0"
                        />
                      );
                    })}
                  </div>
                </div>

                {/* X-axis Date Label */}
                <span
                  className={`mt-1.5 text-[10px] font-medium truncate w-full text-center transition-colors ${
                    isSelected
                      ? 'text-[#071D49] dark:text-sky-300 font-bold'
                      : 'text-[#64748B] dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export interface PO7DayBarItem {
  date: string;
  shortLabel: string;
  fullLabel: string;
  bahanValue: number;
  opsValue: number;
  totalValue: number;
  poCount: number;
}

interface PO7DayValueChartProps {
  days: PO7DayBarItem[];
  dateBasis: 'issue' | 'delivery' | 'distribution';
  onChangeDateBasis: (basis: 'issue' | 'delivery' | 'distribution') => void;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

const formatCompactRupiahTick = (val: number): string => {
  if (val <= 0) return 'Rp 0';
  if (val >= 1_000_000_000) {
    const num = val / 1_000_000_000;
    return `Rp ${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)} M`;
  }
  if (val >= 1_000_000) {
    const num = val / 1_000_000;
    return `Rp ${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)} jt`;
  }
  if (val >= 1_000) {
    return `Rp ${Math.round(val / 1_000)} rb`;
  }
  return `Rp ${Math.round(val)}`;
};

export const PO7DayValueChart: React.FC<PO7DayValueChartProps> = ({
  days,
  dateBasis,
  onChangeDateBasis,
  selectedDate,
  onSelectDate,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total7Days = days.reduce((s, d) => s + d.totalValue, 0);
  const totalBahan = days.reduce((s, d) => s + d.bahanValue, 0);
  const totalOps = days.reduce((s, d) => s + d.opsValue, 0);
  const totalPOs = days.reduce((s, d) => s + d.poCount, 0);
  const avgDaily = days.length > 0 ? Math.round(total7Days / days.length) : 0;

  const rawMax = Math.max(...days.map(d => d.totalValue), 100000);
  const stepUnit = rawMax >= 10_000_000 ? 5_000_000 : rawMax >= 1_000_000 ? 1_000_000 : 100_000;
  const niceMax = Math.max(stepUnit, Math.ceil(rawMax / stepUnit) * stepUnit);
  const midTick = Math.round(niceMax / 2);

  const rangeLabel =
    days.length >= 2
      ? `${days[0].fullLabel} – ${days[days.length - 1].fullLabel}`
      : days[0]?.fullLabel || '-';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header & Basis Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Tren Total Nilai Purchase Order (7 Hari Terakhir)
            </h4>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] dark:bg-sky-950 dark:text-sky-300 text-[10px] font-mono font-bold">
              {rangeLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Akumulasi nilai PO aktif (Bahan Pangan &amp; Operasional Harian). Klik batang grafik untuk memfilter daftar PO tanggal tersebut.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Basis Tanggal:</span>
          {(
            [
              { key: 'issue', label: 'Terbit PO' },
              { key: 'delivery', label: 'Target Kirim H-1' },
              { key: 'distribution', label: 'Distribusi Menu' },
            ] as const
          ).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChangeDateBasis(opt.key)}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                dateBasis === opt.key
                  ? 'bg-[#1E3A8A] text-white dark:bg-sky-600 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Summary KPI Strip + Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
              Total Nilai PO (7 Hari)
            </span>
            <span className="font-mono font-black text-slate-900 dark:text-white tabular-nums">
              {formatRupiah(total7Days)}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
              Rata-Rata / Hari
            </span>
            <span className="font-mono font-bold text-[#1E3A8A] dark:text-sky-300 tabular-nums">
              {formatRupiah(avgDaily)}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
              Total Dokumen PO
            </span>
            <span className="font-mono font-bold text-[#0D9488] dark:text-teal-300 tabular-nums">
              {formatNumber(totalPOs)} PO
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#1E3A8A] dark:bg-sky-500 shrink-0" />
            <span>Bahan Pangan ({formatRupiah(totalBahan)})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#0D9488] dark:bg-teal-400 shrink-0" />
            <span>Operasional ({formatRupiah(totalOps)})</span>
          </span>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative pl-14 sm:pl-16 pr-2 pt-7 pb-1">
        {/* Y-Axis Gridlines */}
        <div
          className="absolute left-14 sm:left-16 right-2 top-7 bottom-7 pointer-events-none flex flex-col justify-between"
          aria-hidden="true"
        >
          <div className="relative border-t border-dashed border-slate-200 dark:border-slate-800">
            <span className="absolute -left-14 sm:-left-16 -top-2 w-12 sm:w-14 text-right text-[10px] font-mono tabular-nums text-slate-400">
              {formatCompactRupiahTick(niceMax)}
            </span>
          </div>
          <div className="relative border-t border-dashed border-slate-200 dark:border-slate-800">
            <span className="absolute -left-14 sm:-left-16 -top-2 w-12 sm:w-14 text-right text-[10px] font-mono tabular-nums text-slate-400">
              {formatCompactRupiahTick(midTick)}
            </span>
          </div>
          <div className="relative border-t border-slate-300 dark:border-slate-700">
            <span className="absolute -left-14 sm:-left-16 -top-2 w-12 sm:w-14 text-right text-[10px] font-mono tabular-nums text-slate-400">
              Rp 0
            </span>
          </div>
        </div>

        {/* 7 Daily Columns */}
        <div className="relative flex items-end justify-around gap-2 sm:gap-4 h-[190px]">
          {days.map((day, idx) => {
            const totalHeightPct = Math.min(100, (day.totalValue / niceMax) * 100);
            const bahanPct = day.totalValue > 0 ? (day.bahanValue / day.totalValue) * 100 : 0;
            const opsPct = day.totalValue > 0 ? (day.opsValue / day.totalValue) * 100 : 0;
            const isHovered = hoveredIdx === idx;
            const isSelected = selectedDate ? selectedDate === day.date : false;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectDate?.(day.date)}
                className={`flex-1 max-w-[84px] h-full flex flex-col items-center justify-end group relative ${
                  onSelectDate ? 'cursor-pointer' : ''
                }`}
              >
                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute -top-3 -translate-y-full z-30 bg-[#142B4A]/95 dark:bg-slate-800/95 backdrop-blur-xs text-white text-[11px] py-2 px-3 rounded-lg shadow-xl border border-white/10 whitespace-nowrap pointer-events-none tabular-nums">
                    <div className="font-bold text-[#F2D58B] mb-1">
                      {day.fullLabel} · {day.poCount} PO
                    </div>
                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sky-200">Bahan Pangan:</span>
                        <span className="font-mono font-semibold text-white">
                          {formatRupiah(day.bahanValue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-teal-300">Operasional:</span>
                        <span className="font-mono font-semibold text-white">
                          {formatRupiah(day.opsValue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-white/15 font-bold">
                        <span>Total Nilai:</span>
                        <span className="font-mono text-[#F2D58B]">
                          {formatRupiah(day.totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stacked Bar Column */}
                <div className="w-full flex flex-col items-center justify-end h-[calc(100%-24px)]">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 mb-1 tabular-nums truncate max-w-full">
                    {day.totalValue > 0 ? formatCompactRupiahTick(day.totalValue).replace('Rp ', '') : '0'}
                  </span>
                  <div
                    className={`w-full max-w-[40px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-200 ${
                      day.totalValue === 0
                        ? 'bg-slate-100 dark:bg-slate-800/70'
                        : isSelected
                        ? 'ring-2 ring-[#1E3A8A] dark:ring-sky-400 ring-offset-1 dark:ring-offset-slate-900'
                        : 'group-hover:brightness-110'
                    }`}
                    style={{
                      height: `${day.totalValue > 0 ? Math.max(totalHeightPct, 6) : 3}%`,
                    }}
                  >
                    {bahanPct > 0 && (
                      <div
                        style={{ height: `${bahanPct}%` }}
                        className="w-full bg-[#1E3A8A] dark:bg-sky-500 transition-all duration-300"
                      />
                    )}
                    {opsPct > 0 && (
                      <div
                        style={{ height: `${opsPct}%` }}
                        className="w-full bg-[#0D9488] dark:bg-teal-400 border-b border-white/25 transition-all duration-300"
                      />
                    )}
                  </div>
                </div>

                {/* X-axis Date Label */}
                <span
                  className={`mt-1.5 text-[10px] font-medium truncate w-full text-center transition-colors ${
                    isSelected
                      ? 'text-[#1E3A8A] dark:text-sky-300 font-bold'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  {day.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

