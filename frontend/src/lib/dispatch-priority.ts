/** Dispatch priority on assignment records (low / medium / high). */
export type AssignPriorityLevel = 'low' | 'medium' | 'high';

/** Same mapping as public auto-assign: critical/urgent → high, high → medium, else low. */
export function assignmentPriorityFromUrgency(
  urgencyLevel: string,
): AssignPriorityLevel {
  const u = urgencyLevel.trim().toLowerCase();
  if (u === 'critical' || u === 'urgent') return 'high';
  if (u === 'high') return 'medium';
  return 'low';
}

export function normalizeAssignmentPriority(
  p: string | undefined | null,
): AssignPriorityLevel {
  const x = String(p ?? 'medium')
    .trim()
    .toLowerCase();
  if (x === 'high' || x === 'low' || x === 'medium') return x;
  return 'medium';
}
