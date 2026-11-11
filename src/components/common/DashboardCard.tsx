import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  badge?: {
    text: string;
    color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  };
  onClick?: () => void;
  accentColor?: 'navy' | 'sky' | 'emerald' | 'amber' | 'rose' | 'indigo';
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  badge,
  onClick,
  accentColor = 'navy',
}) => {
  const accentClasses = {
    navy: 'border-l-blue-900 dark:border-l-sky-500 text-blue-900 dark:text-sky-400 bg-blue-50/50 dark:bg-blue-950/20',
    sky: 'border-l-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20',
    emerald: 'border-l-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20',
    amber: 'border-l-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20',
    rose: 'border-l-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20',
    indigo: 'border-l-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20',
  };

  const badgeColors = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-[3.5px] ${accentClasses[accentColor]} ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {title}
        </p>
        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 shadow-2xs">
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[22px] leading-tight font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums truncate">
          {value}
        </h3>
        {badge && (
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${badgeColors[badge.color || 'blue']}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold shrink-0 flex items-center gap-1 tabular-nums ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
              {trend.label && <span className="font-normal text-slate-400 text-[11px]">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

