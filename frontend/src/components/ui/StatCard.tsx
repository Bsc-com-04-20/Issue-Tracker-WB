import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  accent?: 'default' | 'danger' | 'success' | 'warning';
};

export function StatCard({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
  accent = 'default',
}: StatCardProps) {
  const border =
    accent === 'danger'
      ? 'border-l-4 border-l-red-500'
      : accent === 'success'
        ? 'border-l-4 border-l-emerald-500'
        : accent === 'warning'
          ? 'border-l-4 border-l-amber-500'
          : '';

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${border}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {trend && (
        <p
          className={`mt-2 text-sm font-medium ${
            trendUp === false
              ? 'text-red-600'
              : trendUp === true
                ? 'text-emerald-600'
                : 'text-slate-500'
          }`}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
