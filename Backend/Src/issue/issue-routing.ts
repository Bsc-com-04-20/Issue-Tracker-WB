import { ISSUE_CLASSIFICATION } from './issue-classification';

export function resolveDepartmentFromCategory(category: string): string {
  return ISSUE_CLASSIFICATION[category]?.department ?? 'operations_department';
}

const URGENCY_RANK: Record<string, number> = {
  normal: 0,
  high: 1,
  urgent: 2,
  critical: 3,
};

/** Subcategory wins over category default (public health, major bursts, theft). */
const URGENCY_BY_SUBCATEGORY: Record<string, string> = {
  suspected_contamination: 'critical',
  pipe_burst: 'urgent',
  reservoir_or_tank_damage: 'urgent',
  broken_hydrant: 'urgent',
  no_water_supply: 'urgent',
  intermittent_supply: 'high',
  illegal_water_connection: 'urgent',
  water_theft: 'urgent',
  tampering_with_infrastructure: 'urgent',
  meter_bypass: 'urgent',
  delayed_water_restoration: 'urgent',
};

const URGENCY_BY_CATEGORY: Record<string, string> = {
  water_supply: 'high',
  infrastructure_maintenance: 'high',
  billing_account: 'normal',
  metering: 'normal',
  water_quality: 'high',
  digital_payment: 'normal',
  illegal_connection_fraud: 'high',
};

function normalizeUrgency(value: string | undefined): string | null {
  const v = value?.trim().toLowerCase();
  if (v && v in URGENCY_RANK) return v;
  return null;
}

export function maxUrgencyLevel(a: string, b: string): string {
  const na = URGENCY_RANK[normalizeUrgency(a) ?? 'normal'] ?? 0;
  const nb = URGENCY_RANK[normalizeUrgency(b) ?? 'normal'] ?? 0;
  return na >= nb ? (normalizeUrgency(a) ?? 'normal') : (normalizeUrgency(b) ?? 'normal');
}

/**
 * Board default triage priority from structured category/subcategory.
 * Public reports use this (reporters cannot inflate priority). Staff intake
 * may only raise priority via dto (see IssueService.create).
 */
export function resolveUrgencyLevelFromClassification(
  category: string,
  subcategory: string | null,
): string {
  if (subcategory) {
    const bySub = URGENCY_BY_SUBCATEGORY[subcategory];
    if (bySub) return bySub;
  }
  return URGENCY_BY_CATEGORY[category] ?? 'normal';
}
