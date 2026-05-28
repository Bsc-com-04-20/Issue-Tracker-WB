import type { MaintenanceNotice, WaterSupplyPriority } from './types';

/** Demo scheduled maintenance for Zomba mock supply zones. */
export function getMockMaintenance(
  area?: string,
  supplyZone?: string,
): MaintenanceNotice | null {
  const areaNorm = (area ?? '').trim().toUpperCase();
  const zoneNorm = (supplyZone ?? '').trim().toUpperCase();
  if (areaNorm === 'NACHUMA' || areaNorm === 'CHIKANDA' || zoneNorm.startsWith('ZB-S-')) {
    return {
      restorationTime: '6:30 PM today',
      workOrderRef: 'WO-ZB-2026-0142',
      summary: 'Scheduled mains pressure test and valve replacement',
    };
  }
  return null;
}

export function neighboursClusterMessage(neighbours: string): string | null {
  if (neighbours === 'yes') {
    return (
      'Thank you. We are checking whether there is an ongoing outage in your area. ' +
      'Multiple household reports increase response priority.'
    );
  }
  return null;
}

const DURATION_TO_HOURS: Record<string, number> = {
  lt_1h: 0.5,
  h1_6: 3,
  h6_24: 12,
  gt_24h: 30,
  several_days: 72,
};

export function mapDurationToHours(durationKey: string): number | undefined {
  return DURATION_TO_HOURS[durationKey];
}

export function mapTapBehaviorToAttributes(tapKey: string): {
  tapsAffected: string;
  pressureLevel?: string;
} {
  switch (tapKey) {
    case 'no_water':
      return { tapsAffected: 'all taps — no flow', pressureLevel: 'none' };
    case 'air':
      return { tapsAffected: 'all taps — air sputter', pressureLevel: 'unstable' };
    case 'drip':
      return { tapsAffected: 'all taps — trickle only', pressureLevel: 'very low' };
    case 'irregular':
      return { tapsAffected: 'all taps — irregular flow', pressureLevel: 'fluctuating' };
    default:
      return { tapsAffected: tapKey };
  }
}

const SUPPLY_SCOPE_LABELS: Record<string, string> = {
  whole_property: 'whole property',
  upstairs_only: 'upstairs only',
  downstairs_only: 'downstairs / ground floor',
  one_tap: 'one tap only',
  unknown: 'unknown',
};

export function mapSupplyScope(scopeKey: string): string {
  return SUPPLY_SCOPE_LABELS[scopeKey] ?? scopeKey.replace(/_/g, ' ');
}

const PRESSURE_LABELS: Record<string, string> = {
  trickle: 'very weak trickle',
  weak_usable: 'weak but usable',
  mixed_taps: 'normal on some taps, weak on others',
  peak_hours: 'worse at peak hours',
};

export function mapPressureLevel(key: string): string {
  return PRESSURE_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function mapAirTapBehavior(key: string): { tapsAffected: string; pressureLevel?: string } {
  switch (key) {
    case 'mostly_air':
      return { tapsAffected: 'mostly air, minimal water', pressureLevel: 'unstable' };
    case 'sputter_clears':
      return { tapsAffected: 'spluttering then clears', pressureLevel: 'fluctuating' };
    case 'discoloured_air':
      return { tapsAffected: 'discoloured water with air', pressureLevel: 'unstable' };
    case 'irregular':
      return { tapsAffected: 'irregular flow with air', pressureLevel: 'fluctuating' };
    default:
      return { tapsAffected: key };
  }
}

export function mapPremiseType(premiseKey: string): string {
  const map: Record<string, string> = {
    home: 'household',
    business: 'business',
    school: 'school',
    clinic: 'clinic',
    public_facility: 'public facility',
  };
  return map[premiseKey] ?? premiseKey;
}

export type DemoFieldAssignment = {
  workerName: string;
  workerPhone: string;
  estimatedResponseHours: number;
  department: string;
};

/** Demo dispatch match for Zomba water supply (mock registry technician). */
export function getDemoFieldAssignment(
  district?: string,
  _area?: string,
): DemoFieldAssignment {
  const isZomba = (district ?? '').trim().toUpperCase() === 'ZOMBA';
  return {
    workerName: isZomba ? 'Peter Mbewe' : 'Field Team Lead',
    workerPhone: isZomba ? '+265991000003' : '',
    estimatedResponseHours: 2,
    department: 'Water Supply Operations',
  };
}

export function calculateWaterSupplyPriority(
  subcategory: string,
  attrs: Record<string, string>,
): WaterSupplyPriority {
  if (subcategory === 'no_water_supply') {
    return calculateNoWaterSupplyPriority(attrs);
  }

  let score = 0;
  const neighbours = attrs.neighboursSameIssue ?? '';
  const premise = attrs.premiseType ?? '';
  const duration = attrs.durationBand ?? '';
  const stored = attrs.backupWaterAvailable ?? '';

  if (neighbours === 'yes') score += 25;
  if (['school', 'clinic', 'public_facility'].includes(premise)) score += 35;
  if (duration === 'gt_24h' || duration === 'several_days') score += 25;
  if (stored === 'no') score += 15;

  if (subcategory === 'delayed_water_restoration') score += 20;
  if (subcategory === 'air_in_pipes' && attrs.airWhen === 'every_open') score += 10;
  if (subcategory === 'low_water_pressure' && attrs.pressureLevel === 'trickle') score += 15;
  if (attrs.stillAffected === 'no_water') score += 30;

  let severity: WaterSupplyPriority['severity'] = 'medium';
  let urgency: WaterSupplyPriority['urgency'] = 'normal';
  let scope: WaterSupplyPriority['scope'] = 'household';
  let label = 'Standard';

  if (score >= 55) {
    severity = 'high';
    urgency = 'urgent';
    scope = neighbours === 'yes' ? 'street' : 'household';
    label = 'High';
  } else if (score >= 30) {
    severity = 'medium';
    urgency = 'urgent';
    label = 'Elevated';
  }

  return { severity, urgency, scope, label, score };
}

export function calculateNoWaterSupplyPriority(attrs: Record<string, string>): WaterSupplyPriority {
  let score = 0;
  const neighbours = attrs.neighboursSameIssue ?? '';
  const premise = attrs.premiseType ?? '';
  const duration = attrs.durationBand ?? '';
  const stored = attrs.backupWaterAvailable ?? '';

  if (neighbours === 'yes') score += 35;
  if (neighbours === 'unknown') score += 10;
  if (['school', 'clinic', 'public_facility'].includes(premise)) score += 40;
  if (premise === 'business') score += 15;
  if (duration === 'gt_24h' || duration === 'several_days') score += 30;
  if (duration === 'h6_24') score += 15;
  if (stored === 'no') score += 20;
  if (attrs.clusterBoost === 'true') score += 15;

  let severity: WaterSupplyPriority['severity'] = 'medium';
  let urgency: WaterSupplyPriority['urgency'] = 'normal';
  let scope: WaterSupplyPriority['scope'] = 'household';
  let label = 'Standard';

  if (score >= 70) {
    severity = 'high';
    urgency = 'critical';
    scope = 'community';
    label = 'Critical';
  } else if (score >= 45) {
    severity = 'high';
    urgency = 'urgent';
    scope = neighbours === 'yes' ? 'community' : 'street';
    label = 'High';
  } else if (score >= 25) {
    severity = 'medium';
    urgency = 'urgent';
    scope = neighbours === 'yes' ? 'street' : 'household';
    label = 'Elevated';
  }

  return { severity, urgency, scope, label, score };
}

export function buildWaterSupplyDescription(
  subcategoryLabel: string,
  attrs: Record<string, string>,
  landmark: string,
): string {
  const parts: string[] = [`Water supply report: ${subcategoryLabel}.`];
  if (attrs.neighboursSameIssue) {
    parts.push(`Neighbours affected: ${attrs.neighboursSameIssue}.`);
  }
  if (attrs.tapsAffected) {
    parts.push(`Tap behaviour: ${attrs.tapsAffected}.`);
  }
  if (attrs.durationBand) {
    parts.push(`Duration band: ${attrs.durationBand.replace(/_/g, ' ')}.`);
  }
  if (attrs.backupWaterAvailable) {
    parts.push(`Stored water available: ${attrs.backupWaterAvailable}.`);
  }
  if (attrs.premiseType) {
    parts.push(`Premise type: ${mapPremiseType(attrs.premiseType)}.`);
  }
  if (attrs.maintenanceLinked === 'yes') {
    parts.push('Linked to active scheduled maintenance in the area.');
  }
  if (attrs.supplyScope) {
    parts.push(`Scope: ${attrs.supplyScope.replace(/_/g, ' ')}.`);
  }
  if (attrs.pressureLevel) {
    parts.push(`Pressure: ${attrs.pressureLevel.replace(/_/g, ' ')}.`);
  }
  if (attrs.intermittentPattern) {
    parts.push(`Pattern: ${attrs.intermittentPattern.replace(/_/g, ' ')}.`);
  }
  if (attrs.airWhen) {
    parts.push(`Air timing: ${attrs.airWhen.replace(/_/g, ' ')}.`);
  }
  if (attrs.restorationContext) {
    parts.push(`Restoration context: ${attrs.restorationContext.replace(/_/g, ' ')}.`);
  }
  if (attrs.stillAffected) {
    parts.push(`Current supply state: ${attrs.stillAffected.replace(/_/g, ' ')}.`);
  }
  if (attrs.evidenceFileName) {
    parts.push(`Photo attached: ${attrs.evidenceFileName}.`);
  }
  if (landmark.trim()) {
    parts.push(`Landmark: ${landmark.trim()}.`);
  }
  return parts.join(' ');
}

export const WATER_SUPPLY_SUBCATEGORY_OPTIONS = [
  { value: 'no_water_supply', label: '1. No Water Supply' },
  { value: 'low_water_pressure', label: '2. Low Water Pressure' },
  { value: 'intermittent_supply', label: '3. Intermittent Water Supply' },
  { value: 'air_in_pipes', label: '4. Air Coming from Taps' },
  { value: 'delayed_water_restoration', label: '5. Delayed Water Restoration' },
] as const;

export const PUBLIC_CATEGORY_OPTIONS = [
  { value: 'water_supply', label: '1. Water Supply Issues' },
  { value: 'infrastructure_maintenance', label: '2. Infrastructure & Maintenance' },
  { value: 'billing_account', label: '3. Billing & Account Issues' },
  { value: 'metering', label: '4. Metering Issues' },
  { value: 'water_quality', label: '5. Water Quality Issues' },
  { value: 'digital_payment', label: '6. Digital & Payment System Issues' },
  { value: 'illegal_connection_fraud', label: '7. Illegal Connections & Fraud' },
] as const;
