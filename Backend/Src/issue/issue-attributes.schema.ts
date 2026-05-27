import { BadRequestException } from '@nestjs/common';

export type AttributeFieldType = 'string' | 'number';

export type AttributeFieldDefinition = {
  key: string;
  label: string;
  type: AttributeFieldType;
  required: boolean;
};

type SchemaMap = Record<string, AttributeFieldDefinition[]>;

const waterSupplyFields: AttributeFieldDefinition[] = [
  { key: 'affectedArea', label: 'Affected area', type: 'string', required: true },
  {
    key: 'durationHours',
    label: 'Duration of outage (hours)',
    type: 'number',
    required: false,
  },
  {
    key: 'pressureLevel',
    label: 'Pressure level',
    type: 'string',
    required: false,
  },
  {
    key: 'affectedHouseholds',
    label: 'Affected households',
    type: 'number',
    required: false,
  },
  {
    key: 'issueStartTime',
    label: 'Issue start time',
    type: 'string',
    required: false,
  },
  {
    key: 'supplyScope',
    label: 'Scope (whole property, one tap, street/zone, unknown)',
    type: 'string',
    required: false,
  },
  {
    key: 'neighboursSameIssue',
    label: 'Neighbours reporting the same? (yes / no / unknown)',
    type: 'string',
    required: false,
  },
  {
    key: 'recentNetworkWorkKnown',
    label: 'Known recent planned or emergency work nearby? (yes / no / unknown)',
    type: 'string',
    required: false,
  },
  {
    key: 'tapsAffected',
    label: 'Which taps are affected? (all cold, kitchen only, etc.)',
    type: 'string',
    required: false,
  },
  {
    key: 'premiseType',
    label: 'Premise type (household, business, school, clinic, other)',
    type: 'string',
    required: false,
  },
  {
    key: 'workOrderOrOutageRef',
    label: 'Work order or published outage reference (if any)',
    type: 'string',
    required: false,
  },
];

const infrastructureFields: AttributeFieldDefinition[] = [
  { key: 'pipeSizeMm', label: 'Pipe size (mm)', type: 'number', required: false },
  { key: 'damageLevel', label: 'Damage level', type: 'string', required: true },
  {
    key: 'estimatedWaterWastageLpm',
    label: 'Estimated water wastage (L/min)',
    type: 'number',
    required: false,
  },
  {
    key: 'nearbyLandmark',
    label: 'Nearby landmark',
    type: 'string',
    required: false,
  },
  {
    key: 'visibleDamage',
    label: 'Visible damage description',
    type: 'string',
    required: false,
  },
];

const billingFields: AttributeFieldDefinition[] = [
  { key: 'accountNumber', label: 'Account number', type: 'string', required: true },
  {
    key: 'billingStatementRef',
    label: 'Billing statement reference',
    type: 'string',
    required: false,
  },
  { key: 'paymentMethod', label: 'Payment method', type: 'string', required: false },
  { key: 'transactionId', label: 'Transaction ID', type: 'string', required: false },
];

const meteringFields: AttributeFieldDefinition[] = [
  { key: 'meterNumber', label: 'Meter number', type: 'string', required: true },
  { key: 'meterType', label: 'Meter type', type: 'string', required: false },
  { key: 'errorCode', label: 'Meter error code', type: 'string', required: false },
  { key: 'tokenId', label: 'Token ID', type: 'string', required: false },
];

const waterQualityFields: AttributeFieldDefinition[] = [
  {
    key: 'waterAppearance',
    label: 'Water appearance',
    type: 'string',
    required: true,
  },
  { key: 'odorDescription', label: 'Odor description', type: 'string', required: false },
  { key: 'durationHours', label: 'Duration (hours)', type: 'number', required: false },
  {
    key: 'affectedArea',
    label: 'Affected area',
    type: 'string',
    required: false,
  },
  {
    key: 'labSampleReference',
    label: 'Lab sample / chain-of-custody reference',
    type: 'string',
    required: false,
  },
  {
    key: 'labSampleStatus',
    label:
      'Sample workflow (requested / scheduled / collected / at_lab / completed / escalated)',
    type: 'string',
    required: false,
  },
  {
    key: 'labScheduledAt',
    label: 'Scheduled sampling or pickup (ISO date-time text)',
    type: 'string',
    required: false,
  },
  {
    key: 'labResultSummary',
    label: 'Laboratory result summary (or pending)',
    type: 'string',
    required: false,
  },
];

const digitalFields: AttributeFieldDefinition[] = [
  { key: 'transactionId', label: 'Transaction ID', type: 'string', required: false },
  { key: 'mobileNumber', label: 'Mobile number', type: 'string', required: false },
  {
    key: 'paymentPlatform',
    label: 'Payment platform',
    type: 'string',
    required: false,
  },
  { key: 'errorMessage', label: 'Error message', type: 'string', required: true },
];

const fraudFields: AttributeFieldDefinition[] = [
  {
    key: 'suspectDescription',
    label: 'Suspected activity description',
    type: 'string',
    required: true,
  },
  { key: 'observedAt', label: 'Observed at', type: 'string', required: false },
  { key: 'evidenceNote', label: 'Evidence note', type: 'string', required: false },
];

export const ISSUE_ATTRIBUTE_SCHEMAS: SchemaMap = {
  no_water_supply: waterSupplyFields,
  low_water_pressure: waterSupplyFields,
  intermittent_supply: waterSupplyFields,
  air_in_pipes: waterSupplyFields,
  delayed_water_restoration: waterSupplyFields,

  pipe_burst: infrastructureFields,
  water_leakage: infrastructureFields,
  damaged_valve: infrastructureFields,
  broken_hydrant: infrastructureFields,
  reservoir_or_tank_damage: infrastructureFields,
  illegal_connection_damage: infrastructureFields,
  meter_infrastructure_damage: infrastructureFields,

  estimated_billing_complaint: billingFields,
  incorrect_meter_reading: billingFields,
  duplicate_charges: billingFields,
  payment_not_reflected: billingFields,
  delayed_reconnection: billingFields,
  account_balance_dispute: billingFields,
  wrong_customer_account_mapping: billingFields,

  faulty_meter: meteringFields,
  meter_running_without_water: meteringFields,
  prepaid_meter_token_failure: meteringFields,
  meter_interface_unit_failure: meteringFields,
  tampered_meter: meteringFields,
  meter_leakage: meteringFields,

  brown_or_dirty_water: waterQualityFields,
  bad_smell: waterQualityFields,
  bad_taste: waterQualityFields,
  high_chlorine_levels: waterQualityFields,
  suspected_contamination: waterQualityFields,
  silt_or_mud_presence: waterQualityFields,

  mobile_money_sync_failure: digitalFields,
  failed_online_payment: digitalFields,
  customer_portal_login_failure: digitalFields,
  sms_notification_failure: digitalFields,
  token_generation_failure: digitalFields,
  system_downtime: digitalFields,

  illegal_water_connection: fraudFields,
  meter_bypass: fraudFields,
  water_theft: fraudFields,
  tampering_with_infrastructure: fraudFields,
};

export function validateAndNormalizeIssueAttributes(
  subcategory: string | null,
  raw: unknown,
): Record<string, string | number> | null {
  if (!subcategory) {
    return null;
  }
  const schema = ISSUE_ATTRIBUTE_SCHEMAS[subcategory];
  if (!schema) {
    return null;
  }
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: Record<string, string | number> = {};
  for (const field of schema) {
    const value = data[field.key];
    if (value == null || value === '') {
      if (field.required) {
        throw new BadRequestException(
          `issueAttributes.${field.key} is required for ${subcategory}`,
        );
      }
      continue;
    }
    if (field.type === 'number') {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw new BadRequestException(
          `issueAttributes.${field.key} must be a number`,
        );
      }
      out[field.key] = num;
      continue;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(
        `issueAttributes.${field.key} must be a string`,
      );
    }
    out[field.key] = value.trim();
  }
  return out;
}
