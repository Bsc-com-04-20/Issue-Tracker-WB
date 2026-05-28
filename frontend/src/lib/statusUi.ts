export function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    reported:
      'bg-sky-50 text-sky-800 border border-sky-200',
    assigned:
      'bg-indigo-50 text-indigo-800 border border-indigo-200',
    in_progress:
      'bg-violet-50 text-violet-800 border border-violet-200',
    resolved:
      'bg-emerald-50 text-emerald-800 border border-emerald-200',
    closed: 'bg-slate-100 text-slate-700 border border-slate-200',
  };
  return (
    map[s] ||
    'bg-gray-50 text-gray-700 border border-gray-200'
  );
}

export function priorityUi(level: string): { label: string; className: string } {
  const l = level.toLowerCase();
  if (l === 'high' || l === 'critical' || l === 'urgent') {
    return {
      label: level,
      className: 'text-red-600',
    };
  }
  if (l === 'medium') {
    return { label: level, className: 'text-amber-600' };
  }
  return { label: level, className: 'text-slate-500' };
}

export function channelTag(description: string): string {
  const d = description.slice(0, 40);
  if (d.length < 12) return 'TASK';
  return 'REPORT';
}
