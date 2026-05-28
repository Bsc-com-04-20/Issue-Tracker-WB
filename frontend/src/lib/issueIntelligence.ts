/** Stamped on save by the API — possible open duplicates (phone / proximity). */
export function intakeDuplicateCandidateCount(
  attrs: Record<string, string | number> | null | undefined,
): number {
  const raw = attrs?.intake_duplicate_candidate_count;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(99, Math.floor(n)) : 0;
}

/** Stamped on save — suggestCoDepartments rules snapshot for intake routing. */
export function hasIntakeCoDepartmentHints(
  attrs: Record<string, string | number> | null | undefined,
): boolean {
  const s = attrs?.intake_co_department_suggestions;
  return typeof s === 'string' && s.trim().length > 0;
}
