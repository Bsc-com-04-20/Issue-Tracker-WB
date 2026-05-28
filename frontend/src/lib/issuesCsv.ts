import type { IssueRow } from '@/lib/types';
import { issueKey } from '@/lib/issueKey';

function csvEscape(value: string): string {
  const needs = /[",\n\r]/.test(value);
  const s = value.replace(/"/g, '""');
  return needs ? `"${s}"` : s;
}

/** Build CSV for staff export (UTF-8 BOM optional for Excel). */
export function buildIssuesCsv(rows: IssueRow[]): string {
  const headers = [
    'issue_ref',
    'id',
    'status',
    'department',
    'category',
    'subcategory',
    'urgency',
    'severity',
    'reported_at',
    'reporter',
    'phone',
    'summary',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const summary = (r.description ?? '').slice(0, 2000);
    lines.push(
      [
        csvEscape(issueKey(r.id)),
        String(r.id),
        csvEscape(r.currentStatus?.name ?? ''),
        csvEscape(r.assignedDepartment ?? ''),
        csvEscape(r.issueCategory ?? ''),
        csvEscape(r.issueSubcategory ?? ''),
        csvEscape(r.urgencyLevel ?? ''),
        csvEscape(r.severityLevel ?? ''),
        csvEscape(r.dateReported ?? ''),
        csvEscape(r.reporterName ?? ''),
        csvEscape(r.reporterPhone ?? ''),
        csvEscape(summary),
      ].join(','),
    );
  }
  return `\uFEFF${lines.join('\n')}`;
}

export function downloadIssuesCsv(rows: IssueRow[], filename: string): void {
  const blob = new Blob([buildIssuesCsv(rows)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
