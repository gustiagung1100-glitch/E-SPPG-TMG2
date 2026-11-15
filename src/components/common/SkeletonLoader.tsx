import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-lg bg-slate-200/85 dark:bg-slate-800/90 ${className}`}
  />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Memuat data Dashboard SPPG">
    {/* Header Banner Skeleton */}
    <div className="rounded-xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-2.5 flex-1">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="h-7 w-72 max-w-full" />
        <SkeletonBlock className="h-3.5 w-96 max-w-full" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-11 w-28 rounded-lg" />
        <SkeletonBlock className="h-11 w-28 rounded-lg" />
      </div>
    </div>

    {/* 4 KPI Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map(idx => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
          </div>
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
      ))}
    </div>

    {/* Charts & Operational Split Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
        <SkeletonBlock className="h-5 w-60" />
        <SkeletonBlock className="h-52 w-full rounded-xl" />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="h-14 w-full rounded-lg" />
        <SkeletonBlock className="h-14 w-full rounded-lg" />
        <SkeletonBlock className="h-14 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => (
  <div
    className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-5 space-y-4"
    aria-busy="true"
    aria-label="Memuat tabel data"
  >
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1.5">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-3 w-64" />
      </div>
      <div className="flex gap-2">
        <SkeletonBlock className="h-9 w-24" />
        <SkeletonBlock className="h-9 w-24" />
      </div>
    </div>
    <div className="space-y-2.5 pt-2">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div
          key={rIdx}
          className="grid gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((__, cIdx) => (
            <SkeletonBlock key={cIdx} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const ModuleSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Memuat modul">
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-11 w-11 rounded-xl shrink-0" />
        <div className="space-y-2">
          <SkeletonBlock className="h-5 w-64" />
          <SkeletonBlock className="h-3 w-80 max-w-full" />
        </div>
      </div>
      <SkeletonBlock className="h-10 w-40 rounded-xl" />
    </div>
    <TableSkeleton rows={6} cols={5} />
  </div>
);
