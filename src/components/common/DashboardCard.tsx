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
    navy: 'border-l-blue-900 dark:border-l-blue-700 text-blue-900 dark:text-blue-400',
    sky: 'border-l-sky-500 text-sky-600 dark:text-sky-400',
    emerald: 'border-l-emerald-500 text-emerald-600 dark:text-emerald-400',
    amber: 'border-l-amber-500 text-amber-600 dark:text-amber-400',
    rose: 'border-l-rose-500 text-rose-600 dark:text-rose-400',
    indigo: 'border-l-indigo-600 text-indigo-600 dark:text-indigo-400',
  };

  const badgeColors = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
    slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition duration-200 border-l-4 ${accentClasses[accentColor]} ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {badge && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeColors[badge.color || 'blue']}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold flex items-center gap-1 ${
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}{' '}
              {trend.label && <span className="font-normal text-slate-400">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
