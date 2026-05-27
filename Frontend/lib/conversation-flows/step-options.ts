import type { FlowSelectOption } from './types';

export const ACCOUNT_CONFIRM_OPTIONS: FlowSelectOption[] = [
  { value: 'correct', label: '1. Correct' },
  { value: 'incorrect', label: '2. Incorrect' },
];

export const PHONE_SUFFIX_CONFIRM_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: '1. Yes — this is my number' },
  { value: 'no', label: '2. No — different number' },
];

export const NEIGHBOURS_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: '1. Yes' },
  { value: 'no', label: '2. No' },
  { value: 'unknown', label: '3. Not Sure' },
];

export const MAINTENANCE_REPORT_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: '1. Yes' },
  { value: 'no', label: '2. No' },
];

export const TAP_BEHAVIOR_OPTIONS: FlowSelectOption[] = [
  { value: 'no_water', label: '1. No water at all' },
  { value: 'air', label: '2. Air comes out' },
  { value: 'drip', label: '3. Small dripping' },
  { value: 'irregular', label: '4. Irregular flow' },
];

export const AIR_TAP_BEHAVIOR_OPTIONS: FlowSelectOption[] = [
  { value: 'mostly_air', label: '1. Mostly air, little or no water' },
  { value: 'sputter_clears', label: '2. Spluttering then clears' },
  { value: 'discoloured_air', label: '3. Brown/discoloured water with air' },
  { value: 'irregular', label: '4. Irregular flow' },
];

export const DURATION_OPTIONS: FlowSelectOption[] = [
  { value: 'lt_1h', label: '1. Less than 1 hour' },
  { value: 'h1_6', label: '2. 1–6 hours' },
  { value: 'h6_24', label: '3. More than 6 hours' },
  { value: 'gt_24h', label: '4. More than 24 hours' },
  { value: 'several_days', label: '5. Several days' },
];

export const YES_NO_OPTIONS: FlowSelectOption[] = [
  { value: 'yes', label: '1. Yes' },
  { value: 'no', label: '2. No' },
];

export const PREMISE_TYPE_OPTIONS: FlowSelectOption[] = [
  { value: 'home', label: '1. Home' },
  { value: 'business', label: '2. Business' },
  { value: 'school', label: '3. School' },
  { value: 'clinic', label: '4. Clinic / Hospital' },
  { value: 'public_facility', label: '5. Public Facility' },
];

export const PHOTO_OPTIONS: FlowSelectOption[] = [
  { value: 'upload', label: '1. Attach photo' },
  { value: 'skip', label: '2. Skip' },
];

export const SUPPLY_SCOPE_OPTIONS: FlowSelectOption[] = [
  { value: 'whole_property', label: '1. All taps / whole property' },
  { value: 'upstairs_only', label: '2. Upstairs only' },
  { value: 'downstairs_only', label: '3. Downstairs / ground floor only' },
  { value: 'one_tap', label: '4. One tap only' },
  { value: 'unknown', label: '5. Not sure' },
];

export const PRESSURE_LEVEL_OPTIONS: FlowSelectOption[] = [
  { value: 'trickle', label: '1. Very weak trickle' },
  { value: 'weak_usable', label: '2. Weak but usable' },
  { value: 'mixed_taps', label: '3. Normal on some taps, weak on others' },
  { value: 'peak_hours', label: '4. Worse at peak hours only' },
];

export const INTERMITTENT_PATTERN_OPTIONS: FlowSelectOption[] = [
  { value: 'daily_same_time', label: '1. Cuts off at the same time each day' },
  { value: 'random', label: '2. Random on/off throughout the day' },
  { value: 'morning_only', label: '3. Only low pressure in the morning' },
  { value: 'short_bursts', label: '4. Short bursts then nothing' },
];

export const AIR_WHEN_OPTIONS: FlowSelectOption[] = [
  { value: 'every_open', label: '1. Every time I open a tap' },
  { value: 'after_maintenance', label: '2. After recent maintenance or repairs' },
  { value: 'morning_first', label: '3. Only the first draw in the morning' },
  { value: 'after_outage', label: '4. After water returns following an outage' },
];

export const RESTORATION_CONTEXT_OPTIONS: FlowSelectOption[] = [
  { value: 'maintenance_no_water', label: '1. Maintenance completed but no water yet' },
  { value: 'emergency_waiting', label: '2. Emergency repair — waiting for supply' },
  { value: 'no_notice', label: '3. No notice — supply stopped unexpectedly' },
  { value: 'partial_only', label: '4. Partial restoration only' },
];

export const STILL_AFFECTED_OPTIONS: FlowSelectOption[] = [
  { value: 'no_water', label: '1. No water at all' },
  { value: 'low_pressure', label: '2. Low pressure only' },
  { value: 'partial', label: '3. Partially restored' },
  { value: 'fully_restored', label: '4. Fully restored (reporting delay)' },
];

export const RESOLUTION_CONFIRM_OPTIONS: FlowSelectOption[] = [
  { value: 'confirmed', label: '1. Yes — water supply restored' },
  { value: 'disputed', label: '2. No — still not resolved' },
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
        { value: 'minor', label: '1. Minor / cosmetic' },
        { value: 'moderate', label: '2. Moderate — water escaping' },
        { value: 'major', label: '3. Major — road or property at risk' },
        { value: 'emergency', label: '4. Emergency — uncontained flow' },
      ];
    case 'infSafety':
      return NEIGHBOURS_OPTIONS;
    case 'billPaymentMethod':
      return [
        { value: 'mobile_money', label: '1. Mobile money' },
        { value: 'bank', label: '2. Bank transfer' },
        { value: 'cash_office', label: '3. Cash office' },
        { value: 'na', label: '4. Not applicable' },
      ];
    case 'metWhenStarted':
      return [
        { value: 'today', label: '1. Today' },
        { value: 'this_week', label: '2. This week' },
        { value: 'over_week', label: '3. More than a week ago' },
      ];
    case 'wqAppearance':
      return [
        { value: 'brown_dirty', label: '1. Brown or dirty' },
        { value: 'cloudy', label: '2. Cloudy / milky' },
        { value: 'smell', label: '3. Clear but smells bad' },
        { value: 'other', label: '4. Other' },
      ];
    case 'wqDuration':
      return DURATION_OPTIONS.slice(0, 4);
    case 'wqPremise':
      return PREMISE_TYPE_OPTIONS.slice(0, 4);
    case 'wqHealth':
      return NEIGHBOURS_OPTIONS;
    case 'digPlatform':
      return [
        { value: 'mobile_money', label: '1. Mobile money' },
        { value: 'portal', label: '2. Customer portal / app' },
        { value: 'sms', label: '3. SMS / token' },
        { value: 'other', label: '4. Other' },
      ];
    case 'digWhen':
      return [
        { value: 'last_hour', label: '1. In the last hour' },
        { value: 'today', label: '2. Today' },
        { value: 'this_week', label: '3. Earlier this week' },
      ];
    case 'fraudLocationType':
      return [
        { value: 'residential', label: '1. Residential area' },
        { value: 'commercial', label: '2. Commercial area' },
        { value: 'open_land', label: '3. Open land / roadside' },
        { value: 'unknown', label: '4. Unknown' },
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
