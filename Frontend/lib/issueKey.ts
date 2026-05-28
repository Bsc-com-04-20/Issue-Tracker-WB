export function issueKey(id: number): string {
  return `ISS-${id}`;
}

/** Customer-facing reference for water supply complaints (demo format). */
export function publicWaterSupplyRef(id: number): string {
  const year = new Date().getFullYear();
  return `WS-${year}-${String(id).padStart(6, '0')}`;
}

export function parseIssueKeyParam(param: string): number | null {
  const m = /^ISS-(\d+)$/i.exec(param.trim());
  if (m) return Number(m[1]);
  const n = Number(param);
  return Number.isFinite(n) ? n : null;
}
