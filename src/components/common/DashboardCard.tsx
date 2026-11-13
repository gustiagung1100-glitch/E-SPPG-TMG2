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
    navy: 'bg-[#142B4A]/8 text-[#142B4A] border-[#142B4A]/15 dark:bg-slate-800 dark:text-sky-400 dark:border-slate-700',
    sky: 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/60',
    emerald: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
    amber: 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
    rose: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
    indigo: 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60',
  };

  const badgeColors = {
    blue: 'bg-[#2563EB]/10 text-[#2563EB] dark:bg-blue-950/80 dark:text-blue-300 border border-[#2563EB]/20 dark:border-blue-800',
    emerald: 'bg-[#16A34A]/10 text-[#16A34A] dark:bg-emerald-950/80 dark:text-emerald-300 border border-[#16A34A]/20 dark:border-emerald-800',
    amber: 'bg-[#D97706]/10 text-[#D97706] dark:bg-amber-950/80 dark:text-amber-300 border border-[#D97706]/20 dark:border-amber-800',
    rose: 'bg-[#DC2626]/10 text-[#DC2626] dark:bg-rose-950/80 dark:text-rose-300 border border-[#DC2626]/20 dark:border-rose-800',
    slate: 'bg-[#F4F7FA] text-[#64748B] dark:bg-slate-800 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-[0_1px_3px_rgba(20,43,74,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(20,43,74,0.1)] transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[#142B4A]/30 dark:hover:border-slate-700 active:scale-[0.995]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 truncate">
          {title}
        </p>
        <div className={`p-2 rounded-lg border shrink-0 ${iconContainerClasses[accentColor]}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[22px] leading-tight font-extrabold text-[#1F2937] dark:text-white tracking-tight tabular-nums truncate">
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

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold shrink-0 flex items-center gap-1 tabular-nums ${
                trend.isPositive ? 'text-[#16A34A] dark:text-emerald-400' : 'text-[#DC2626] dark:text-rose-400'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
              {trend.label && <span className="font-normal text-[#64748B] text-[11px]">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
