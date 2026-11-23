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
  const iconContainerClasses = {
    navy: 'bg-blue-50 text-[#1E3A8A] border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
    sky: 'bg-teal-50 text-[#0D9488] border-teal-200/70 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
    emerald: 'bg-teal-50 text-[#0D9488] border-teal-200/70 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
    amber: 'bg-amber-50 text-[#D97706] border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
    rose: 'bg-rose-50 text-[#E11D48] border-rose-200/70 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
    indigo: 'bg-blue-50 text-[#1E3A8A] border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  };

  const badgeColors = {
    blue: 'bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800',
    emerald: 'bg-teal-50 text-[#0D9488] dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800',
    amber: 'bg-amber-50 text-[#D97706] dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800',
    rose: 'bg-rose-50 text-[#E11D48] dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between h-full transition-all duration-200 ease-out ${
        onClick ? 'cursor-pointer hover:border-[#1E3A8A]/40 dark:hover:border-slate-700 active:scale-[0.98]' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
            {title}
          </p>
          <div className={`p-2.5 rounded-lg border shrink-0 ${iconContainerClasses[accentColor]}`}>
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <h3 className="text-2xl leading-tight font-bold text-slate-900 dark:text-white tracking-tight tabular-nums truncate">
            {value}
          </h3>
          {badge && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold shrink-0 whitespace-nowrap ${badgeColors[badge.color || 'blue']}`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold shrink-0 flex items-center gap-1 tabular-nums ${
                trend.isPositive ? 'text-[#0D9488] dark:text-teal-400' : 'text-[#E11D48] dark:text-rose-400'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
              {trend.label && <span className="font-normal text-slate-600 dark:text-slate-400 text-[11px]">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
