import type { FlowSelectOption } from './types';

export const ACCOUNT_CONFIRM_OPTIONS: FlowSelectOption[] = [
  { value: 'correct', label: 'Correct' },
  { value: 'incorrect', label: 'Incorrect' },
];

export const PHONE_SUFFIX_CONFIRM_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: 'Yes — this is my number' },
  { value: 'no', label: 'No — different number' },
];

export const NEIGHBOURS_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Not sure' },
];

export const MAINTENANCE_REPORT_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: 'Yes, report anyway' },
  { value: 'no', label: 'No, not needed' },
];

export const TAP_BEHAVIOR_OPTIONS: FlowSelectOption[] = [
  { value: 'no_water', label: 'No water at all' },
  { value: 'air', label: 'Air comes out' },
  { value: 'drip', label: 'Small dripping' },
  { value: 'irregular', label: 'Irregular flow' },
];

export const AIR_TAP_BEHAVIOR_OPTIONS: FlowSelectOption[] = [
  { value: 'mostly_air', label: 'Mostly air, little or no water' },
  { value: 'sputter_clears', label: 'Spluttering then clears' },
  { value: 'discoloured_air', label: 'Brown or discoloured water with air' },
  { value: 'irregular', label: 'Irregular flow' },
];

export const DURATION_OPTIONS: FlowSelectOption[] = [
  { value: 'lt_1h', label: 'Less than 1 hour' },
  { value: 'h1_6', label: '1–6 hours' },
  { value: 'h6_24', label: 'More than 6 hours' },
  { value: 'gt_24h', label: 'More than 24 hours' },
  { value: 'several_days', label: 'Several days' },
];

export const YES_NO_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const PREMISE_TYPE_OPTIONS: FlowSelectOption[] = [
  { value: 'home', label: 'Home' },
  { value: 'business', label: 'Business' },
  { value: 'school', label: 'School' },
  { value: 'clinic', label: 'Clinic / hospital' },
  { value: 'public_facility', label: 'Public facility' },
];

export const PHOTO_OPTIONS: FlowSelectOption[] = [
  { value: 'upload', label: 'Attach photo' },
  { value: 'skip', label: 'Skip' },
];

export const SUPPLY_SCOPE_OPTIONS: FlowSelectOption[] = [
  { value: 'whole_property', label: 'All taps / whole property' },
  { value: 'upstairs_only', label: 'Upstairs only' },
  { value: 'downstairs_only', label: 'Downstairs / ground floor only' },
  { value: 'one_tap', label: 'One tap only' },
  { value: 'unknown', label: 'Not sure' },
];

export const PRESSURE_LEVEL_OPTIONS: FlowSelectOption[] = [
  { value: 'trickle', label: 'Very weak trickle' },
  { value: 'weak_usable', label: 'Weak but usable' },
  { value: 'mixed_taps', label: 'Normal on some taps, weak on others' },
  { value: 'peak_hours', label: 'Worse at peak hours only' },
];

export const INTERMITTENT_PATTERN_OPTIONS: FlowSelectOption[] = [
  { value: 'daily_same_time', label: 'Cuts off at the same time each day' },
  { value: 'random', label: 'Random on/off throughout the day' },
  { value: 'morning_only', label: 'Only low pressure in the morning' },
  { value: 'short_bursts', label: 'Short bursts then nothing' },
];

export const AIR_WHEN_OPTIONS: FlowSelectOption[] = [
  { value: 'every_open', label: 'Every time I open a tap' },
  { value: 'after_maintenance', label: 'After recent maintenance or repairs' },
  { value: 'morning_first', label: 'Only the first draw in the morning' },
  { value: 'after_outage', label: 'After water returns following an outage' },
];

export const RESTORATION_CONTEXT_OPTIONS: FlowSelectOption[] = [
  { value: 'maintenance_no_water', label: 'Maintenance done but no water yet' },
  { value: 'emergency_waiting', label: 'Emergency repair — waiting for supply' },
  { value: 'no_notice', label: 'No notice — supply stopped unexpectedly' },
  { value: 'partial_only', label: 'Partial restoration only' },
];

export const STILL_AFFECTED_OPTIONS: FlowSelectOption[] = [
  { value: 'no_water', label: 'No water at all' },
  { value: 'low_pressure', label: 'Low pressure only' },
  { value: 'partial', label: 'Partially restored' },
  { value: 'fully_restored', label: 'Fully restored (reporting delay)' },
];

export const RESOLUTION_CONFIRM_OPTIONS: FlowSelectOption[] = [
  { value: 'confirmed', label: 'Yes — water supply restored' },
  { value: 'disputed', label: 'No — still not resolved' },
];

export function optionsForPublicStep(stepId: string): FlowSelectOption[] {
  switch (stepId) {
    case 'accountConfirm':
      return ACCOUNT_CONFIRM_OPTIONS;
    case 'registryPhoneSuffix':
      return PHONE_SUFFIX_CONFIRM_OPTIONS;
    case 'wsNeighboursAffected':
      return NEIGHBOURS_OPTIONS;
    case 'wsMaintenanceStillReport':
      return MAINTENANCE_REPORT_OPTIONS;
    case 'wsTapBehavior':
      return TAP_BEHAVIOR_OPTIONS;
    case 'wsAirTapBehavior':
      return AIR_TAP_BEHAVIOR_OPTIONS;
    case 'wsDuration':
      return DURATION_OPTIONS;
    case 'wsStoredWater':
      return YES_NO_OPTIONS;
    case 'wsPremiseType':
      return PREMISE_TYPE_OPTIONS;
    case 'wsPhotoEvidence':
      return PHOTO_OPTIONS;
    case 'wsSupplyScope':
      return SUPPLY_SCOPE_OPTIONS;
    case 'wsPressureLevel':
      return PRESSURE_LEVEL_OPTIONS;
    case 'wsIntermittentPattern':
      return INTERMITTENT_PATTERN_OPTIONS;
    case 'wsAirWhen':
      return AIR_WHEN_OPTIONS;
    case 'wsRestorationContext':
      return RESTORATION_CONTEXT_OPTIONS;
    case 'wsStillAffected':
      return STILL_AFFECTED_OPTIONS;
    case 'catPhotoEvidence':
      return PHOTO_OPTIONS;
    case 'infDamageLevel':
      return [
        { value: 'minor', label: 'Minor / cosmetic' },
        { value: 'moderate', label: 'Moderate — water escaping' },
        { value: 'major', label: 'Major — road or property at risk' },
        { value: 'emergency', label: 'Emergency — uncontained flow' },
      ];
    case 'infSafety':
      return NEIGHBOURS_OPTIONS;
    case 'billPaymentMethod':
      return [
        { value: 'mobile_money', label: 'Mobile money' },
        { value: 'bank', label: 'Bank transfer' },
        { value: 'cash_office', label: 'Cash office' },
        { value: 'na', label: 'Not applicable' },
      ];
    case 'metWhenStarted':
      return [
        { value: 'today', label: 'Today' },
        { value: 'this_week', label: 'This week' },
        { value: 'over_week', label: 'More than a week ago' },
      ];
    case 'wqAppearance':
      return [
        { value: 'brown_dirty', label: 'Brown or dirty' },
        { value: 'cloudy', label: 'Cloudy / milky' },
        { value: 'smell', label: 'Clear but smells bad' },
        { value: 'other', label: 'Other' },
      ];
    case 'wqDuration':
      return DURATION_OPTIONS.slice(0, 4);
    case 'wqPremise':
      return PREMISE_TYPE_OPTIONS.slice(0, 4);
    case 'wqHealth':
      return NEIGHBOURS_OPTIONS;
    case 'digPlatform':
      return [
        { value: 'mobile_money', label: 'Mobile money' },
        { value: 'portal', label: 'Customer portal / app' },
        { value: 'sms', label: 'SMS / token' },
        { value: 'other', label: 'Other' },
      ];
    case 'digWhen':
      return [
        { value: 'last_hour', label: 'In the last hour' },
        { value: 'today', label: 'Today' },
        { value: 'this_week', label: 'Earlier this week' },
      ];
    case 'fraudLocationType':
      return [
        { value: 'residential', label: 'Residential area' },
        { value: 'commercial', label: 'Commercial area' },
        { value: 'open_land', label: 'Open land / roadside' },
        { value: 'unknown', label: 'Unknown' },
      ];
    case 'fraudOngoing':
      return NEIGHBOURS_OPTIONS;
    default:
      return [];
  }
}

export function labelForPublicStepValue(stepId: string, value: string): string {
  const opts = optionsForPublicStep(stepId);
  const hit = opts.find((o) => o.value === value);
  if (hit) return hit.label;
  if (stepId === 'categoryPlaceholderDescription') return value;
  if (stepId === 'wsLandmark') return value;
  return value.replace(/_/g, ' ');
}
