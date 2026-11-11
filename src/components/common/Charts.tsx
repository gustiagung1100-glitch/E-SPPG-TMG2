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
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
      {(title || subtitle) && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            {title && (
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {title}
              </h4>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {(primaryLabel || secondaryLabel) && (
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-900 dark:bg-sky-500" />
                {primaryLabel}
              </span>
              {secondaryLabel && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 dark:bg-sky-300" />
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
                <div className="absolute -top-12 z-20 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs text-white text-[11px] py-1.5 px-3 rounded-lg shadow-xl border border-slate-700/60 whitespace-nowrap pointer-events-none tabular-nums animate-in fade-in zoom-in-95 duration-100">
                  <div className="font-bold text-sky-400">{item.label}</div>
                  <div className="text-slate-200">
                    {primaryLabel}: {valueFormatter(item.value)}
                  </div>
                  {item.secondaryValue !== undefined && secondaryLabel && (
                    <div className="text-sky-300">
                      {secondaryLabel}: {valueFormatter(item.secondaryValue)}
                    </div>
                  )}
                </div>
              )}

              {/* Bars */}
              <div className="w-full flex items-end justify-center gap-1 h-full">
                {/* Primary Bar */}
                <div
                  className="w-full max-w-[28px] rounded-t-md transition-all duration-300 relative bg-blue-900 hover:bg-blue-800 dark:bg-sky-500 dark:hover:bg-sky-400"
                  style={{
                    height: `${Math.max(primaryHeightPct, 4)}%`,
                    backgroundColor: item.color,
                  }}
                />

                {/* Secondary Bar if exists */}
                {item.secondaryValue !== undefined && (
                  <div
                    className="w-full max-w-[28px] rounded-t-md transition-all duration-300 bg-sky-400 hover:bg-sky-300 dark:bg-sky-300"
                    style={{ height: `${Math.max(secondaryHeightPct, 4)}%` }}
                  />
                )}
              </div>

              {/* Label below */}
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 truncate w-full text-center group-hover:text-slate-900 dark:group-hover:text-white transition">
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

  // Generate SVG conic path or segments
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </h4>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-none tabular-nums">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-semibold tracking-wider">
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
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatNumber(item.value)}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">({pct}%)</span>
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
  targetLabel = 'Plafon BGN (Rp 15.000)',
  actualLabel = 'Realisasi Food Cost',
}) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.actual, d.target)), 18000);
  const minVal = 10000;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-3 h-0.5 bg-blue-900 dark:bg-sky-400" />
            {actualLabel}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-3 h-0.5 border-t border-dashed border-rose-500" />
            {targetLabel}
          </span>
        </div>
      </div>

      <div className="h-44 w-full relative pt-4 pb-2">
        {/* Horizontal target threshold line */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-rose-400 dark:border-rose-500 z-0 flex items-center justify-end"
          style={{
            top: `${100 - ((15000 - minVal) / (maxVal - minVal)) * 100}%`,
          }}
        >
          <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 px-1 font-mono font-semibold">
            Plafon Rp 15.000
          </span>
        </div>

        {/* Data points */}
        <div className="h-full flex items-end justify-between relative z-10">
          {data.map((item, idx) => {
            const pct = ((item.actual - minVal) / (maxVal - minVal)) * 100;
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
                    backgroundColor: isUnderBudget ? '#0284c7' : '#e11d48',
                  }}
                />

                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 absolute -top-9 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs text-white text-[11px] py-1 px-2.5 rounded-lg shadow-xl border border-slate-700/60 pointer-events-none whitespace-nowrap z-20 tabular-nums">
                  <span className="font-bold text-sky-300">{item.label}</span>: {formatRupiah(item.actual)}
                </div>

                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2">
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
