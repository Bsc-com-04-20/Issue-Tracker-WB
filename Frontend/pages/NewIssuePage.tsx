import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, CircleCheck, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, parseJson } from '@/lib/api';
import { canCreateIssue } from '@/lib/auth';
import { issueKey, publicWaterSupplyRef } from '@/lib/issueKey';
import {
  buildPublicConversationSteps,
  publicCategoryStepOptions,
  publicWaterSubcategoryOptions,
} from '@/lib/conversation-flows/public-flow';
import { subcategoryOptionsForCategory } from '@/lib/conversation-flows/category-guided-flows';
import { buildCategoryIssueDescription } from '@/lib/conversation-flows/category-descriptions';
import { mapPublicIssueAttributes } from '@/lib/conversation-flows/map-public-attributes';
import {
  labelForPublicStepValue,
  optionsForPublicStep,
} from '@/lib/conversation-flows/step-options';
import { PublicReportSuccess } from '@/components/public-report/PublicReportSuccess';
import {
  buildWaterSupplyDescription,
  calculateWaterSupplyPriority,
  getMockMaintenance,
  mapAirTapBehavior,
  mapDurationToHours,
  mapPremiseType,
  mapPressureLevel,
  mapSupplyScope,
  mapTapBehaviorToAttributes,
  neighboursClusterMessage,
} from '@/lib/conversation-flows/water-supply-flow';
import { rememberComplaint } from '@/lib/publicIssueHistory';
import { OperationalBriefingPanel } from '@/components/operational-assistant/OperationalBriefingPanel';
import type { CategoryRedirect } from '@/lib/operational-assistant/conversation-engine';
import {
  evaluateOperationalBriefing,
  getStepOperationalOverlay,
  inferConversationPhase,
  isEmergencySubcategory,
} from '@/lib/operational-assistant/conversation-engine';
import type {
  MeterVerifyStartResponse,
  PremiseMeterLookupResponse,
  PublicDistrictRow,
  PublicIssueCreateResult,
} from '@/lib/types';

type AttributeField = {
  key: string;
  label: string;
  type: 'string' | 'number';
  required: boolean;
};

type BotStep = {
  id: string;
  prompt: string;
  type: 'text' | 'select';
  optional?: boolean;
  helperText?: string;
};

function PremiseRegistryCard({ lookup }: { lookup: PremiseMeterLookupResponse }) {
  if (!lookup.found) return null;
  return (
    <div className="ml-5 max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
      <p className="font-semibold text-emerald-900">Account linked to this meter</p>
      <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
        {lookup.customerName && (
          <div>
            <dt className="font-medium text-emerald-800">Account holder</dt>
            <dd>{lookup.customerName}</dd>
          </div>
        )}
        {lookup.accountNumber && (
          <div>
            <dt className="font-medium text-emerald-800">Billing account</dt>
            <dd>{lookup.accountNumber}</dd>
          </div>
        )}
        {lookup.meterType && (
          <div>
            <dt className="font-medium text-emerald-800">Meter type</dt>
            <dd>{lookup.meterType}</dd>
          </div>
        )}
        {lookup.physicalAddress && (
          <div className="sm:col-span-2">
            <dt className="font-medium text-emerald-800">Registered address</dt>
            <dd>{lookup.physicalAddress}</dd>
          </div>
        )}
        {(lookup.district || lookup.area) && (
          <div>
            <dt className="font-medium text-emerald-800">District / area</dt>
            <dd>
              {[lookup.district, lookup.area].filter(Boolean).join(' · ')}
            </dd>
          </div>
        )}
        {lookup.serviceArea && (
          <div>
            <dt className="font-medium text-emerald-800">Service area</dt>
            <dd>{lookup.serviceArea}</dd>
          </div>
        )}
        {lookup.accountStatus && (
          <div>
            <dt className="font-medium text-emerald-800">Account status</dt>
            <dd>{lookup.accountStatus.replace(/_/g, ' ')}</dd>
          </div>
        )}
        {lookup.phoneHintLast4 && (
          <div>
            <dt className="font-medium text-emerald-800">Registered phone</dt>
            <dd>Ends in {lookup.phoneHintLast4}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

const CATEGORY_PROMPTS: Record<string, string> = {
  water_supply:
    'We can run quick supply diagnostics first. Which supply issue best matches the customer report?',
  infrastructure_maintenance:
    'This might require urgent field dispatch. Which infrastructure issue was observed?',
  billing_account:
    'Let us classify the account investigation correctly. Which billing issue applies?',
  metering:
    'We can route this to metering operations quickly. Which meter problem was reported?',
  water_quality:
    'Water quality issues are escalated carefully. Which quality symptom is most accurate?',
  digital_payment:
    'We can triage digital and payment channels. Which platform issue happened?',
  illegal_connection_fraud:
    'Fraud reports are access-controlled. Which suspicious activity is being reported?',
};

const CATEGORY_OPTIONS = [
  {
    value: 'water_supply',
    label: 'Water Supply Issues',
    subcategories: [
      'no_water_supply',
      'low_water_pressure',
      'intermittent_supply',
      'air_in_pipes',
      'delayed_water_restoration',
    ],
  },
  {
    value: 'infrastructure_maintenance',
    label: 'Infrastructure and Maintenance Issues',
    subcategories: [
      'pipe_burst',
      'water_leakage',
      'damaged_valve',
      'broken_hydrant',
      'reservoir_or_tank_damage',
      'illegal_connection_damage',
      'meter_infrastructure_damage',
    ],
  },
  {
    value: 'billing_account',
    label: 'Billing and Account Issues',
    subcategories: [
      'estimated_billing_complaint',
      'incorrect_meter_reading',
      'duplicate_charges',
      'payment_not_reflected',
      'delayed_reconnection',
      'account_balance_dispute',
      'wrong_customer_account_mapping',
    ],
  },
  {
    value: 'metering',
    label: 'Metering Issues',
    subcategories: [
      'faulty_meter',
      'meter_running_without_water',
      'prepaid_meter_token_failure',
      'meter_interface_unit_failure',
      'tampered_meter',
      'meter_leakage',
    ],
  },
  {
    value: 'water_quality',
    label: 'Water Quality Issues',
    subcategories: [
      'brown_or_dirty_water',
      'bad_smell',
      'bad_taste',
      'high_chlorine_levels',
      'suspected_contamination',
      'silt_or_mud_presence',
    ],
  },
  {
    value: 'digital_payment',
    label: 'Digital and Payment System Issues',
    subcategories: [
      'mobile_money_sync_failure',
      'failed_online_payment',
      'customer_portal_login_failure',
      'sms_notification_failure',
      'token_generation_failure',
      'system_downtime',
    ],
  },
  {
    value: 'illegal_connection_fraud',
    label: 'Illegal Connections and Fraud',
    subcategories: [
      'illegal_water_connection',
      'meter_bypass',
      'water_theft',
      'tampering_with_infrastructure',
    ],
  },
];

/** Matches backend `waterSupplyFields` in `issue-attributes.schema.ts`. */
const WATER_SUPPLY_ATTRIBUTES: AttributeField[] = [
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
  { key: 'issueStartTime', label: 'Issue start time', type: 'string', required: false },
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

const WATER_QUALITY_ATTRIBUTES: AttributeField[] = [
  { key: 'waterAppearance', label: 'Water appearance', type: 'string', required: true },
  { key: 'odorDescription', label: 'Odor description', type: 'string', required: false },
  { key: 'durationHours', label: 'Duration (hours)', type: 'number', required: false },
  { key: 'affectedArea', label: 'Affected area', type: 'string', required: false },
  {
    key: 'labSampleReference',
    label: 'Lab sample / chain-of-custody reference',
    type: 'string',
    required: false,
  },
  {
    key: 'labSampleStatus',
    label: 'Sample workflow (requested / collected / at_lab / …)',
    type: 'string',
    required: false,
  },
  {
    key: 'labScheduledAt',
    label: 'Scheduled sampling (ISO date-time)',
    type: 'string',
    required: false,
  },
  {
    key: 'labResultSummary',
    label: 'Laboratory result summary',
    type: 'string',
    required: false,
  },
];

const ATTRIBUTE_SCHEMAS: Record<string, AttributeField[]> = {
  no_water_supply: WATER_SUPPLY_ATTRIBUTES,
  low_water_pressure: WATER_SUPPLY_ATTRIBUTES,
  intermittent_supply: WATER_SUPPLY_ATTRIBUTES,
  air_in_pipes: WATER_SUPPLY_ATTRIBUTES,
  delayed_water_restoration: WATER_SUPPLY_ATTRIBUTES,
  pipe_burst: [
    { key: 'damageLevel', label: 'Damage level', type: 'string', required: true },
    { key: 'pipeSizeMm', label: 'Pipe size (mm)', type: 'number', required: false },
    {
      key: 'estimatedWaterWastageLpm',
      label: 'Estimated water wastage (L/min)',
      type: 'number',
      required: false,
    },
    { key: 'nearbyLandmark', label: 'Nearby landmark', type: 'string', required: false },
    {
      key: 'visibleDamage',
      label: 'Visible damage description',
      type: 'string',
      required: false,
    },
  ],
  water_leakage: [
    { key: 'damageLevel', label: 'Damage level', type: 'string', required: true },
    {
      key: 'estimatedWaterWastageLpm',
      label: 'Estimated water wastage (L/min)',
      type: 'number',
      required: false,
    },
  ],
  damaged_valve: [{ key: 'damageLevel', label: 'Damage level', type: 'string', required: true }],
  broken_hydrant: [{ key: 'damageLevel', label: 'Damage level', type: 'string', required: true }],
  reservoir_or_tank_damage: [{ key: 'damageLevel', label: 'Damage level', type: 'string', required: true }],
  illegal_connection_damage: [{ key: 'damageLevel', label: 'Damage level', type: 'string', required: true }],
  meter_infrastructure_damage: [{ key: 'damageLevel', label: 'Damage level', type: 'string', required: true }],
  estimated_billing_complaint: [
    { key: 'accountNumber', label: 'Account number', type: 'string', required: true },
    { key: 'billingStatementRef', label: 'Billing statement reference', type: 'string', required: false },
  ],
  incorrect_meter_reading: [
    { key: 'accountNumber', label: 'Account number', type: 'string', required: true },
    { key: 'meterNumber', label: 'Meter number', type: 'string', required: false },
  ],
  duplicate_charges: [
    { key: 'accountNumber', label: 'Account number', type: 'string', required: true },
    { key: 'transactionId', label: 'Transaction ID', type: 'string', required: false },
  ],
  payment_not_reflected: [
    { key: 'accountNumber', label: 'Account number', type: 'string', required: true },
    { key: 'paymentMethod', label: 'Payment method', type: 'string', required: false },
    { key: 'transactionId', label: 'Transaction ID', type: 'string', required: false },
  ],
  delayed_reconnection: [{ key: 'accountNumber', label: 'Account number', type: 'string', required: true }],
  account_balance_dispute: [{ key: 'accountNumber', label: 'Account number', type: 'string', required: true }],
  wrong_customer_account_mapping: [{ key: 'accountNumber', label: 'Account number', type: 'string', required: true }],
  faulty_meter: [{ key: 'meterNumber', label: 'Meter number', type: 'string', required: true }],
  meter_running_without_water: [{ key: 'meterNumber', label: 'Meter number', type: 'string', required: true }],
  prepaid_meter_token_failure: [
    { key: 'meterNumber', label: 'Meter number', type: 'string', required: true },
    { key: 'tokenId', label: 'Token ID', type: 'string', required: false },
  ],
  meter_interface_unit_failure: [{ key: 'meterNumber', label: 'Meter number', type: 'string', required: true }],
  tampered_meter: [{ key: 'meterNumber', label: 'Meter number', type: 'string', required: true }],
  meter_leakage: [{ key: 'meterNumber', label: 'Meter number', type: 'string', required: true }],
  brown_or_dirty_water: WATER_QUALITY_ATTRIBUTES,
  bad_smell: WATER_QUALITY_ATTRIBUTES,
  bad_taste: WATER_QUALITY_ATTRIBUTES,
  high_chlorine_levels: WATER_QUALITY_ATTRIBUTES,
  suspected_contamination: WATER_QUALITY_ATTRIBUTES,
  silt_or_mud_presence: WATER_QUALITY_ATTRIBUTES,
  mobile_money_sync_failure: [
    { key: 'errorMessage', label: 'Error message', type: 'string', required: true },
    { key: 'transactionId', label: 'Transaction ID', type: 'string', required: false },
    { key: 'mobileNumber', label: 'Mobile number', type: 'string', required: false },
    { key: 'paymentPlatform', label: 'Payment platform', type: 'string', required: false },
  ],
  failed_online_payment: [{ key: 'errorMessage', label: 'Error message', type: 'string', required: true }],
  customer_portal_login_failure: [{ key: 'errorMessage', label: 'Error message', type: 'string', required: true }],
  sms_notification_failure: [{ key: 'errorMessage', label: 'Error message', type: 'string', required: true }],
  token_generation_failure: [{ key: 'errorMessage', label: 'Error message', type: 'string', required: true }],
  system_downtime: [{ key: 'errorMessage', label: 'Error message', type: 'string', required: true }],
  illegal_water_connection: [
    { key: 'suspectDescription', label: 'Suspected activity', type: 'string', required: true },
  ],
  meter_bypass: [{ key: 'suspectDescription', label: 'Suspected activity', type: 'string', required: true }],
  water_theft: [{ key: 'suspectDescription', label: 'Suspected activity', type: 'string', required: true }],
  tampering_with_infrastructure: [
    { key: 'suspectDescription', label: 'Suspected activity', type: 'string', required: true },
  ],
};

function resolveRoutingHintText(
  hints: Record<string, string>,
  category: string,
  subcategory: string,
): string | null {
  const exact = hints[`${category}:${subcategory}`];
  if (exact) return exact;
  return hints[`${category}:__default__`] ?? null;
}

export function NewIssuePage({ mode = 'staff' }: { mode?: 'staff' | 'public' }) {
  const { user } = useAuth();
  const role = user?.role ?? '';
  if (mode === 'staff' && !canCreateIssue(role)) {
    return <Navigate to="/app/issues" replace />;
  }

  const [description, setDescription] = useState('');
  const [issueCategory, setIssueCategory] = useState('water_supply');
  const [issueSubcategory, setIssueSubcategory] = useState('no_water_supply');
  const [issueAttributes, setIssueAttributes] = useState<Record<string, string>>(
    {},
  );
  const [severityLevel, setSeverityLevel] = useState('medium');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');
  const [accountNumber, setAccountNumber] = useState('');
  const [affectedScope, setAffectedScope] = useState('household');
  const [reportChannel, setReportChannel] = useState('phone');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [latitude, setLatitude] = useState('-13.9626');
  const [longitude, setLongitude] = useState('33.7741');
  const [addressDescription, setAddressDescription] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [meterLookup, setMeterLookup] = useState<PremiseMeterLookupResponse | null>(
    null,
  );
  const [meterLookupError, setMeterLookupError] = useState<string | null>(null);
  const [meterLookupLoading, setMeterLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [publicCreateResult, setPublicCreateResult] = useState<PublicIssueCreateResult | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [botStepIndex, setBotStepIndex] = useState(0);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [intakeRoutingHints, setIntakeRoutingHints] = useState<
    Record<string, string>
  >({});
  const [districtRows, setDistrictRows] = useState<PublicDistrictRow[]>([]);
  const [locationRows, setLocationRows] = useState<{ number: number; label: string }[]>(
    [],
  );
  const [publicDistrictNumber, setPublicDistrictNumber] = useState('');
  const [publicLocationNumber, setPublicLocationNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [meterVerifySessionId, setMeterVerifySessionId] = useState('');
  const [meterVerificationId, setMeterVerificationId] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [pendingBotAction, setPendingBotAction] = useState(false);
  const [accountConfirmChoice, setAccountConfirmChoice] = useState('');
  const [phoneSuffixChoice, setPhoneSuffixChoice] = useState('');
  const [maintenanceDeclined, setMaintenanceDeclined] = useState(false);
  const [conversationAborted, setConversationAborted] = useState(false);
  const [flowStatusMessage, setFlowStatusMessage] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const maintenanceNotice = useMemo(
    () =>
      mode === 'public' && meterLookup?.found
        ? getMockMaintenance(meterLookup.area, meterLookup.supplyZone)
        : null,
    [mode, meterLookup?.area, meterLookup?.found, meterLookup?.supplyZone],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/issue/intake-routing-hints');
        if (!res.ok || cancelled) return;
        const data = await parseJson<Record<string, string>>(res);
        if (cancelled || !data || typeof data !== 'object') return;
        setIntakeRoutingHints(data);
      } catch {
        /* hints are optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'public') return;
    let cancelled = false;
    (async () => {
      const res = await apiFetch('/issue/public/districts');
      if (!res.ok || cancelled) return;
      const data = await parseJson<PublicDistrictRow[]>(res);
      if (Array.isArray(data)) setDistrictRows(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'public' || !publicDistrictNumber) {
      setLocationRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await apiFetch(
        `/issue/public/locations/${encodeURIComponent(publicDistrictNumber)}`,
      );
      if (!res.ok || cancelled) return;
      const data = await parseJson<{ locations?: { number: number; label: string }[] }>(
        res,
      );
      setLocationRows(Array.isArray(data.locations) ? data.locations : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, publicDistrictNumber]);

  useEffect(() => {
    if (mode !== 'public' || !meterLookup?.area?.trim() || !publicDistrictNumber) return;
    if (locationRows.length === 0) return;
    const areaNorm = meterLookup.area.trim().toUpperCase();
    const loc = locationRows.find((l) => l.label.toUpperCase() === areaNorm);
    if (loc) {
      setPublicLocationNumber(String(loc.number));
    }
  }, [mode, meterLookup?.area, publicDistrictNumber, locationRows]);

  useEffect(() => {
    if (mode !== 'public') return;
    const id = requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [botStepIndex, mode, pendingBotAction, flowStatusMessage]);

  const routingHintText = useMemo(
    () =>
      resolveRoutingHintText(intakeRoutingHints, issueCategory, issueSubcategory),
    [intakeRoutingHints, issueCategory, issueSubcategory],
  );

  const requiredAttributeFields = useMemo(
    () => (ATTRIBUTE_SCHEMAS[issueSubcategory] ?? []).filter((field) => field.required),
    [issueSubcategory],
  );

  const recommendedPriority = useMemo(() => {
    if (isEmergencySubcategory(issueSubcategory)) {
      return {
        severity: 'high',
        urgency: 'critical',
        scope: affectedScope === 'household' ? 'community' : affectedScope,
        reason: 'Emergency-pattern subcategory detected; escalate to immediate dispatch.',
      };
    }
    if (mode === 'public' && issueCategory === 'water_supply') {
      const calc = calculateWaterSupplyPriority(issueSubcategory, issueAttributes);
      return {
        severity: calc.severity,
        urgency: calc.urgency,
        scope: calc.scope,
        reason: `Water supply triage: ${calc.label} priority (score ${calc.score}).`,
      };
    }
    if (issueCategory === 'water_supply') {
      const neighbours = (issueAttributes.neighboursSameIssue ?? '').toLowerCase();
      const scope =
        neighbours.includes('yes') || affectedScope === 'community'
          ? 'community'
          : affectedScope;
      return {
        severity: scope === 'community' ? 'high' : 'medium',
        urgency: scope === 'community' ? 'urgent' : 'normal',
        scope,
        reason:
          scope === 'community'
            ? 'Area-level supply signal detected from diagnostics.'
            : 'Likely premise-level supply issue; normal SLA lane.',
      };
    }
    if (issueCategory === 'water_quality') {
      return {
        severity: 'high',
        urgency: 'urgent',
        scope: affectedScope === 'household' ? 'street' : affectedScope,
        reason: 'Water quality issue requires precautionary escalation and lab workflow.',
      };
    }
    return {
      severity: severityLevel,
      urgency: urgencyLevel,
      scope: affectedScope,
      reason: 'Current values are aligned with selected category.',
    };
  }, [
    affectedScope,
    issueAttributes,
    issueCategory,
    issueSubcategory,
    mode,
    severityLevel,
    urgencyLevel,
  ]);

  useEffect(() => {
    setSeverityLevel(recommendedPriority.severity);
    setUrgencyLevel(recommendedPriority.urgency);
    setAffectedScope(recommendedPriority.scope);
  }, [recommendedPriority]);

  const botSteps: BotStep[] = useMemo(
    () => {
      if (mode === 'public') {
        return buildPublicConversationSteps({
          issueCategory,
          issueSubcategory,
          meterLookup,
          phoneHintLast4: meterLookup?.phoneHintLast4,
          maintenanceActive: Boolean(maintenanceNotice),
          maintenanceDeclined,
          maintenanceRestorationTime: maintenanceNotice?.restorationTime,
        });
      }

      return [
        {
          id: 'issueCategory',
          prompt: 'Hello. What category best matches this complaint?',
          type: 'select',
          helperText: 'Choose the customer complaint domain first.',
        },
        {
          id: 'issueSubcategory',
          prompt:
            CATEGORY_PROMPTS[issueCategory] ??
            'Which specific issue type was reported?',
          type: 'select',
          helperText: 'This controls routing, SLA policy, and suggested crew handling.',
        },
        ...requiredAttributeFields.map((field) => ({
          id: `attr:${field.key}`,
          prompt: `${field.label}?`,
          type: 'text' as const,
          helperText: 'Structured fields improve escalation and analytics quality.',
        })),
        {
          id: 'description',
          prompt:
            issueCategory === 'water_supply'
              ? 'Briefly describe symptoms and when they started (for diagnostics).'
              : 'Please describe what is happening.',
          type: 'text',
        },
        {
          id: 'meterNumber',
          prompt: 'Meter number (optional, but helps with account validation).',
          type: 'text',
          optional: true,
        },
        {
          id: 'reporterName',
          prompt: 'What is the full name of the reporter?',
          type: 'text',
        },
        {
          id: 'reporterPhone',
          prompt: 'What is the reporter phone number for updates?',
          type: 'text',
        },
        {
          id: 'addressDescription',
          prompt: 'Where is the issue located (landmark, street, or area)?',
          type: 'text',
        },
        {
          id: 'reporterEmail',
          prompt: 'Email for closure confirmation (optional).',
          type: 'text',
          optional: true,
        },
        { id: 'latitude', prompt: 'Provide latitude for geo-tagging.', type: 'text' },
        { id: 'longitude', prompt: 'Provide longitude for geo-tagging.', type: 'text' },
        { id: 'reportChannel', prompt: 'How was this complaint reported?', type: 'select' },
        { id: 'severityLevel', prompt: 'What is the severity level?', type: 'select' },
        { id: 'affectedScope', prompt: 'What scope is affected?', type: 'select' },
        { id: 'urgencyLevel', prompt: 'What urgency should be assigned?', type: 'select' },
      ];
    },
    [
      issueCategory,
      issueSubcategory,
      maintenanceDeclined,
      maintenanceNotice,
      meterLookup,
      mode,
      requiredAttributeFields,
    ],
  );

  useEffect(() => {
    if (mode !== 'public' || botStepIndex < botSteps.length) return;
    const subLabel = issueSubcategory.replace(/_/g, ' ');
    const built =
      issueCategory === 'water_supply'
        ? buildWaterSupplyDescription(subLabel, issueAttributes, addressDescription)
        : buildCategoryIssueDescription(
            issueCategory,
            issueSubcategory,
            issueAttributes,
            addressDescription,
          );
    if (built.trim()) {
      setDescription(built);
    }
    const areaLabel = meterLookup?.area?.trim() || addressDescription.trim();
    if (areaLabel && issueCategory === 'water_supply') {
      setIssueAttributes((prev) => {
        if (prev.affectedArea?.trim()) return prev;
        return { ...prev, affectedArea: areaLabel };
      });
    }
  }, [
    addressDescription,
    botStepIndex,
    botSteps.length,
    issueAttributes,
    issueCategory,
    issueSubcategory,
    meterLookup?.area,
    mode,
  ]);

  const currentBotStep = botSteps[botStepIndex];

  useEffect(() => {
    if (mode !== 'public' || currentBotStep?.id !== 'billAccountConfirm') return;
    const acct = meterLookup?.accountNumber?.trim() || accountNumber.trim();
    if (!acct || issueAttributes.billAccountConfirm?.trim()) return;
    setIssueAttributes((prev) => ({
      ...prev,
      billAccountConfirm: acct,
      accountNumber: acct,
    }));
  }, [
    accountNumber,
    currentBotStep?.id,
    issueAttributes.billAccountConfirm,
    meterLookup?.accountNumber,
    mode,
  ]);

  const conversationPhase = useMemo(
    () =>
      inferConversationPhase(
        currentBotStep?.id,
        botStepIndex,
        botSteps.length,
      ),
    [botStepIndex, botSteps.length, currentBotStep?.id],
  );

  const operationalBriefing = useMemo(
    () =>
      evaluateOperationalBriefing({
        mode,
        phase: conversationPhase,
        currentStepId: currentBotStep?.id,
        issueCategory,
        issueSubcategory,
        description,
        issueAttributes,
        severityLevel,
        urgencyLevel,
        affectedScope,
        meterVerified: Boolean(meterVerificationId.trim()),
        intakeRoutingHint: routingHintText,
      }),
    [
      affectedScope,
      conversationPhase,
      currentBotStep?.id,
      description,
      issueAttributes,
      issueCategory,
      issueSubcategory,
      meterVerificationId,
      mode,
      routingHintText,
      severityLevel,
      urgencyLevel,
    ],
  );

  const stepOperationalOverlay = useMemo(() => {
    if (!currentBotStep) return {};
    return getStepOperationalOverlay(
      currentBotStep.id,
      {
        mode,
        phase: conversationPhase,
        currentStepId: currentBotStep.id,
        issueCategory,
        issueSubcategory,
        description,
        issueAttributes,
        severityLevel,
        urgencyLevel,
        affectedScope,
        meterVerified: Boolean(meterVerificationId.trim()),
        intakeRoutingHint: routingHintText,
      },
      operationalBriefing,
    );
  }, [
    affectedScope,
    conversationPhase,
    currentBotStep,
    description,
    issueAttributes,
    issueCategory,
    issueSubcategory,
    meterVerificationId,
    mode,
    operationalBriefing,
    routingHintText,
    severityLevel,
    urgencyLevel,
  ]);

  function applyCategoryRedirect(redirect: CategoryRedirect): void {
    setIssueCategory(redirect.toCategory);
    setIssueSubcategory(redirect.toSubcategory);
    setIssueAttributes({});
  }

  function operationalContextForStep(
    stepId: string,
    stepIndex: number,
  ): Parameters<typeof evaluateOperationalBriefing>[0] {
    return {
      mode,
      phase: inferConversationPhase(stepId, stepIndex, botSteps.length),
      currentStepId: stepId,
      issueCategory,
      issueSubcategory,
      description,
      issueAttributes,
      severityLevel,
      urgencyLevel,
      affectedScope,
      meterVerified: Boolean(meterVerificationId.trim()),
      intakeRoutingHint: routingHintText,
    };
  }

  function formatStepPrompt(step: BotStep, stepIndex: number): string {
    const overlay = getStepOperationalOverlay(
      step.id,
      operationalContextForStep(step.id, stepIndex),
      operationalBriefing,
    );
    return overlay.promptPrefix ? `${overlay.promptPrefix} ${step.prompt}` : step.prompt;
  }

  function getBotValue(stepId: string): string {
    if (stepId.startsWith('attr:')) {
      const key = stepId.slice(5);
      return issueAttributes[key] ?? '';
    }
    switch (stepId) {
      case 'issueCategory':
        return issueCategory;
      case 'issueSubcategory':
        return issueSubcategory;
      case 'description':
        return description;
      case 'registryMeter':
      case 'meterNumber':
        return meterNumber;
      case 'registryPhone':
      case 'reporterPhone':
        return reporterPhone;
      case 'registryOtp':
        return otpCode;
      case 'publicDistrict':
        return publicDistrictNumber;
      case 'publicLocation':
        return publicLocationNumber;
      case 'locationNarrative':
      case 'addressDescription':
        return addressDescription;
      case 'reporterName':
        return reporterName;
      case 'reporterEmail':
        return reporterEmail;
      case 'latitude':
        return latitude;
      case 'longitude':
        return longitude;
      case 'reportChannel':
        return reportChannel;
      case 'severityLevel':
        return severityLevel;
      case 'affectedScope':
        return affectedScope;
      case 'urgencyLevel':
        return urgencyLevel;
      case 'accountConfirm':
        return accountConfirmChoice;
      case 'registryPhoneSuffix':
        return phoneSuffixChoice;
      case 'wsNeighboursAffected':
        return issueAttributes.neighboursSameIssue ?? '';
      case 'wsMaintenanceStillReport':
        return issueAttributes.maintenanceStillReport ?? '';
      case 'wsTapBehavior':
        return issueAttributes.tapBehaviorKey ?? '';
      case 'wsDuration':
        return issueAttributes.durationBand ?? '';
      case 'wsStoredWater':
        return issueAttributes.backupWaterAvailable ?? '';
      case 'wsPremiseType':
        return issueAttributes.premiseType ?? '';
      case 'wsPhotoEvidence':
        return issueAttributes.photoIntent ?? 'skip';
      case 'catPhotoEvidence':
        return issueAttributes.catPhotoIntent ?? issueAttributes.photoIntent ?? 'skip';
      case 'infDamageLevel':
        return issueAttributes.infDamageLevel ?? issueAttributes.damageLevel ?? '';
      case 'infVisible':
        return issueAttributes.infVisible ?? issueAttributes.visibleDamage ?? '';
      case 'infSafety':
        return issueAttributes.infSafety ?? '';
      case 'billAccountConfirm':
        return issueAttributes.billAccountConfirm ?? accountNumber;
      case 'billPaymentMethod':
        return issueAttributes.billPaymentMethod ?? '';
      case 'billTransactionId':
        return issueAttributes.billTransactionId ?? issueAttributes.transactionId ?? '';
      case 'billDetail':
        return issueAttributes.billDetail ?? '';
      case 'metErrorCode':
        return issueAttributes.metErrorCode ?? issueAttributes.errorCode ?? '';
      case 'metTokenId':
        return issueAttributes.metTokenId ?? issueAttributes.tokenId ?? '';
      case 'metWhenStarted':
        return issueAttributes.metWhenStarted ?? '';
      case 'metDetail':
        return issueAttributes.metDetail ?? '';
      case 'wqAppearance':
        return issueAttributes.wqAppearance ?? '';
      case 'wqDuration':
        return issueAttributes.wqDuration ?? issueAttributes.durationBand ?? '';
      case 'wqPremise':
        return issueAttributes.wqPremise ?? issueAttributes.premiseType ?? '';
      case 'wqHealth':
        return issueAttributes.wqHealth ?? '';
      case 'digPlatform':
        return issueAttributes.digPlatform ?? issueAttributes.paymentPlatform ?? '';
      case 'digErrorMessage':
        return issueAttributes.digErrorMessage ?? issueAttributes.errorMessage ?? '';
      case 'digTransactionId':
        return issueAttributes.digTransactionId ?? issueAttributes.transactionId ?? '';
      case 'digWhen':
        return issueAttributes.digWhen ?? '';
      case 'fraudObserved':
        return issueAttributes.fraudObserved ?? issueAttributes.suspectDescription ?? '';
      case 'fraudLocationType':
        return issueAttributes.fraudLocationType ?? '';
      case 'fraudOngoing':
        return issueAttributes.fraudOngoing ?? '';
      case 'wsSupplyScope':
        return issueAttributes.supplyScopeKey ?? '';
      case 'wsPressureLevel':
        return issueAttributes.pressureLevelKey ?? '';
      case 'wsIntermittentPattern':
        return issueAttributes.intermittentPattern ?? '';
      case 'wsAirWhen':
        return issueAttributes.airWhen ?? '';
      case 'wsAirTapBehavior':
        return issueAttributes.tapBehaviorKey ?? '';
      case 'wsRestorationContext':
        return issueAttributes.restorationContext ?? '';
      case 'wsStillAffected':
        return issueAttributes.stillAffected ?? '';
      case 'wsLandmark':
        return addressDescription;
      case 'categoryPlaceholderDescription':
        return description;
      default:
        return '';
    }
  }

  function pickCategoryFromDrawer(categoryValue: string): void {
    const def = CATEGORY_OPTIONS.find((x) => x.value === categoryValue);
    setIssueCategory(categoryValue);
    setIssueSubcategory(def?.subcategories[0] ?? '');
    setIssueAttributes({});
    setCategoryDrawerOpen(false);
    if (botStepIndex > 0) {
      setBotStepIndex(0);
      setDescription('');
      setReporterName('');
      setReporterPhone('');
      setAddressDescription('');
      setPublicDistrictNumber('');
      setPublicLocationNumber('');
      setMeterVerificationId('');
      setMeterVerifySessionId('');
      setOtpCode('');
      setDemoOtpHint(null);
    }
  }

  function applyPremiseFromLookup(j: PremiseMeterLookupResponse): void {
    if (j.customerName?.trim()) {
      setReporterName(j.customerName.trim());
    }
    if (j.latitude != null && j.longitude != null) {
      setLatitude(String(j.latitude));
      setLongitude(String(j.longitude));
    }
    if (j.serviceArea?.trim()) {
      setServiceArea(j.serviceArea.trim());
    }
    if (j.accountNumber?.trim()) {
      setAccountNumber(j.accountNumber.trim());
    }
    if (j.physicalAddress?.trim()) {
      setAddressDescription(j.physicalAddress.trim());
    }
    if (j.district?.trim() && districtRows.length > 0) {
      const dNorm = j.district.trim().toUpperCase();
      const row = districtRows.find(
        (d) => d.name.toUpperCase() === dNorm || d.code.toUpperCase() === dNorm,
      );
      if (row) {
        setPublicDistrictNumber(String(row.number));
      }
    }
  }

  function setBotValue(stepId: string, value: string): void {
    if (stepId.startsWith('attr:')) {
      const key = stepId.slice(5);
      setIssueAttributes((prev) => ({ ...prev, [key]: value }));
      return;
    }
    switch (stepId) {
      case 'issueCategory': {
        setIssueCategory(value);
        const def = CATEGORY_OPTIONS.find((x) => x.value === value);
        setIssueSubcategory(def?.subcategories[0] ?? '');
        setIssueAttributes({});
        setMaintenanceDeclined(false);
        setConversationAborted(false);
        setFlowStatusMessage(null);
        break;
      }
      case 'issueSubcategory':
        setIssueSubcategory(value);
        setIssueAttributes({});
        setMaintenanceDeclined(false);
        setEvidenceFile(null);
        setFlowStatusMessage(null);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'registryMeter':
      case 'meterNumber':
        setMeterNumber(value);
        break;
      case 'registryPhone':
      case 'reporterPhone':
        setReporterPhone(value);
        break;
      case 'registryOtp':
        setOtpCode(value);
        break;
      case 'publicDistrict':
        setPublicDistrictNumber(value);
        setPublicLocationNumber('');
        break;
      case 'publicLocation':
        setPublicLocationNumber(value);
        break;
      case 'locationNarrative':
      case 'addressDescription':
        setAddressDescription(value);
        break;
      case 'reporterName':
        setReporterName(value);
        break;
      case 'reporterEmail':
        setReporterEmail(value);
        break;
      case 'latitude':
        setLatitude(value);
        break;
      case 'longitude':
        setLongitude(value);
        break;
      case 'reportChannel':
        setReportChannel(value);
        break;
      case 'severityLevel':
        setSeverityLevel(value);
        break;
      case 'affectedScope':
        setAffectedScope(value);
        break;
      case 'urgencyLevel':
        setUrgencyLevel(value);
        break;
      case 'accountConfirm':
        setAccountConfirmChoice(value);
        break;
      case 'registryPhoneSuffix':
        setPhoneSuffixChoice(value);
        break;
      case 'wsNeighboursAffected':
        setIssueAttributes((prev) => ({
          ...prev,
          neighboursSameIssue: value,
          clusterBoost: value === 'yes' ? 'true' : prev.clusterBoost,
        }));
        break;
      case 'wsMaintenanceStillReport':
        setIssueAttributes((prev) => ({
          ...prev,
          maintenanceStillReport: value,
          maintenanceLinked: value === 'yes' ? 'yes' : prev.maintenanceLinked,
        }));
        if (value === 'no') {
          setMaintenanceDeclined(true);
        }
        break;
      case 'wsTapBehavior': {
        const tap = mapTapBehaviorToAttributes(value);
        setIssueAttributes((prev) => ({
          ...prev,
          tapBehaviorKey: value,
          tapsAffected: tap.tapsAffected,
          pressureLevel: tap.pressureLevel ?? prev.pressureLevel,
        }));
        break;
      }
      case 'wsDuration': {
        const hours = mapDurationToHours(value);
        setIssueAttributes((prev) => ({
          ...prev,
          durationBand: value,
          ...(hours != null ? { durationHours: String(hours) } : {}),
        }));
        break;
      }
      case 'wsStoredWater':
        setIssueAttributes((prev) => ({ ...prev, backupWaterAvailable: value }));
        break;
      case 'wsPremiseType':
        setIssueAttributes((prev) => ({
          ...prev,
          premiseType: value,
          premiseTypeLabel: mapPremiseType(value),
        }));
        break;
      case 'wsPhotoEvidence':
        setIssueAttributes((prev) => ({ ...prev, photoIntent: value }));
        if (value !== 'upload') {
          setEvidenceFile(null);
        }
        break;
      case 'catPhotoEvidence':
        setIssueAttributes((prev) => ({ ...prev, catPhotoIntent: value, photoIntent: value }));
        if (value !== 'upload') {
          setEvidenceFile(null);
        }
        break;
      case 'infDamageLevel':
        setIssueAttributes((prev) => ({ ...prev, infDamageLevel: value, damageLevel: value }));
        break;
      case 'infVisible':
        setIssueAttributes((prev) => ({ ...prev, infVisible: value, visibleDamage: value }));
        break;
      case 'infSafety':
        setIssueAttributes((prev) => ({ ...prev, infSafety: value }));
        break;
      case 'billAccountConfirm':
        setIssueAttributes((prev) => ({
          ...prev,
          billAccountConfirm: value,
          accountNumber: value.trim(),
        }));
        break;
      case 'billPaymentMethod':
        setIssueAttributes((prev) => ({ ...prev, billPaymentMethod: value }));
        break;
      case 'billTransactionId':
        setIssueAttributes((prev) => ({ ...prev, billTransactionId: value, transactionId: value }));
        break;
      case 'billDetail':
        setIssueAttributes((prev) => ({ ...prev, billDetail: value }));
        break;
      case 'metErrorCode':
        setIssueAttributes((prev) => ({ ...prev, metErrorCode: value, errorCode: value }));
        break;
      case 'metTokenId':
        setIssueAttributes((prev) => ({ ...prev, metTokenId: value, tokenId: value }));
        break;
      case 'metWhenStarted':
        setIssueAttributes((prev) => ({ ...prev, metWhenStarted: value }));
        break;
      case 'metDetail':
        setIssueAttributes((prev) => ({ ...prev, metDetail: value }));
        break;
      case 'wqAppearance':
        setIssueAttributes((prev) => ({
          ...prev,
          wqAppearance: value,
          waterAppearance: value.replace(/_/g, ' '),
        }));
        break;
      case 'wqDuration':
        setIssueAttributes((prev) => ({ ...prev, wqDuration: value, durationBand: value }));
        break;
      case 'wqPremise':
        setIssueAttributes((prev) => ({ ...prev, wqPremise: value, premiseType: value }));
        break;
      case 'wqHealth':
        setIssueAttributes((prev) => ({ ...prev, wqHealth: value }));
        break;
      case 'digPlatform':
        setIssueAttributes((prev) => ({ ...prev, digPlatform: value, paymentPlatform: value }));
        break;
      case 'digErrorMessage':
        setIssueAttributes((prev) => ({
          ...prev,
          digErrorMessage: value,
          errorMessage: value,
        }));
        break;
      case 'digTransactionId':
        setIssueAttributes((prev) => ({
          ...prev,
          digTransactionId: value,
          transactionId: value,
        }));
        break;
      case 'digWhen':
        setIssueAttributes((prev) => ({ ...prev, digWhen: value }));
        break;
      case 'fraudObserved':
        setIssueAttributes((prev) => ({
          ...prev,
          fraudObserved: value,
          suspectDescription: value,
        }));
        break;
      case 'fraudLocationType':
        setIssueAttributes((prev) => ({ ...prev, fraudLocationType: value }));
        break;
      case 'fraudOngoing':
        setIssueAttributes((prev) => ({ ...prev, fraudOngoing: value }));
        break;
      case 'wsSupplyScope':
        setIssueAttributes((prev) => ({
          ...prev,
          supplyScopeKey: value,
          supplyScope: mapSupplyScope(value),
          affectedArea: prev.affectedArea || mapSupplyScope(value),
        }));
        break;
      case 'wsPressureLevel':
        setIssueAttributes((prev) => ({
          ...prev,
          pressureLevelKey: value,
          pressureLevel: mapPressureLevel(value),
        }));
        break;
      case 'wsIntermittentPattern':
        setIssueAttributes((prev) => ({ ...prev, intermittentPattern: value }));
        break;
      case 'wsAirWhen':
        setIssueAttributes((prev) => ({ ...prev, airWhen: value }));
        break;
      case 'wsAirTapBehavior': {
        const tap = mapAirTapBehavior(value);
        setIssueAttributes((prev) => ({
          ...prev,
          tapBehaviorKey: value,
          tapsAffected: tap.tapsAffected,
          pressureLevel: tap.pressureLevel ?? prev.pressureLevel,
        }));
        break;
      }
      case 'wsRestorationContext':
        setIssueAttributes((prev) => ({ ...prev, restorationContext: value }));
        break;
      case 'wsStillAffected':
        setIssueAttributes((prev) => ({ ...prev, stillAffected: value }));
        break;
      case 'wsLandmark':
        setAddressDescription(value);
        break;
      case 'categoryPlaceholderDescription':
        setDescription(value);
        break;
      default:
        break;
    }
  }

  function optionLabel(stepId: string, value: string): string {
    if (mode === 'public') {
      if (stepId === 'issueCategory') {
        return publicCategoryStepOptions().find((x) => x.value === value)?.label ?? value;
      }
      if (stepId === 'issueSubcategory') {
        if (issueCategory !== 'water_supply') {
          return (
            subcategoryOptionsForCategory(issueCategory).find((x) => x.value === value)
              ?.label ?? value
          );
        }
        return publicWaterSubcategoryOptions().find((x) => x.value === value)?.label ?? value;
      }
      const publicLabel = labelForPublicStepValue(stepId, value);
      if (publicLabel !== value.replace(/_/g, ' ') || optionsForPublicStep(stepId).length > 0) {
        return publicLabel;
      }
    }
    if (stepId === 'issueCategory') {
      return CATEGORY_OPTIONS.find((x) => x.value === value)?.label ?? value;
    }
    if (stepId === 'registryMeter') {
      return value.trim();
    }
    if (stepId === 'publicDistrict') {
      const row = districtRows.find((d) => String(d.number) === value);
      return row ? `${row.number} — ${row.name}` : value;
    }
    if (stepId === 'publicLocation') {
      const row = locationRows.find((d) => String(d.number) === value);
      return row ? `${row.number} — ${row.label}` : value;
    }
    return value.replace(/_/g, ' ');
  }

  function stepAttributeType(stepId: string): 'string' | 'number' | null {
    if (!stepId.startsWith('attr:')) return null;
    const key = stepId.slice(5);
    const field = requiredAttributeFields.find((x) => x.key === key);
    return field?.type ?? 'string';
  }

  function isStepSatisfied(step: BotStep): boolean {
    if (step.optional) return true;
    if (step.id === 'registryOtp') {
      return otpCode.trim().length >= 4;
    }
    if (step.id === 'accountConfirm') {
      return accountConfirmChoice === 'correct';
    }
    if (step.id === 'registryPhoneSuffix') {
      return phoneSuffixChoice === 'yes';
    }
    if (step.id === 'wsPhotoEvidence' || step.id === 'catPhotoEvidence') {
      const intent =
        step.id === 'catPhotoEvidence'
          ? (issueAttributes.catPhotoIntent ?? issueAttributes.photoIntent ?? 'skip')
          : (issueAttributes.photoIntent ?? 'skip');
      if (intent === 'upload') {
        return Boolean(evidenceFile);
      }
      return true;
    }
    if (step.id === 'publicLocation') {
      return Boolean(publicDistrictNumber && publicLocationNumber.trim());
    }
    const value = getBotValue(step.id).trim();
    return Boolean(value);
  }

  function stepOptions(stepId: string): Array<{ value: string; label: string }> {
    if (mode === 'public') {
      if (stepId === 'issueCategory') {
        return publicCategoryStepOptions();
      }
      if (stepId === 'issueSubcategory') {
        if (issueCategory !== 'water_supply') {
          return subcategoryOptionsForCategory(issueCategory);
        }
        return publicWaterSubcategoryOptions();
      }
      const publicOpts = optionsForPublicStep(stepId);
      if (publicOpts.length > 0) {
        return publicOpts;
      }
    }
    if (stepId === 'issueCategory') {
      return CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label }));
    }
    if (stepId === 'issueSubcategory') {
      return (
        CATEGORY_OPTIONS.find((x) => x.value === issueCategory)?.subcategories ?? []
      ).map((sub) => ({ value: sub, label: sub.replace(/_/g, ' ') }));
    }
    if (stepId === 'affectedScope') {
      return ['household', 'street', 'community'].map((x) => ({ value: x, label: x }));
    }
    if (stepId === 'urgencyLevel') {
      return ['normal', 'urgent', 'critical'].map((x) => ({ value: x, label: x }));
    }
    if (stepId === 'severityLevel') {
      return ['low', 'medium', 'high'].map((x) => ({ value: x, label: x }));
    }
    if (stepId === 'reportChannel') {
      return [
        'phone',
        'walk_in',
        'web',
        'sms',
        'whatsapp',
        'facebook',
        'email',
        'community_leader',
      ].map((x) => ({ value: x, label: x.replace(/_/g, ' ') }));
    }
    if (stepId === 'publicDistrict') {
      return districtRows.map((d) => ({
        value: String(d.number),
        label: `${d.number}. ${d.name}`,
      }));
    }
    if (stepId === 'publicLocation') {
      return locationRows.map((loc) => ({
        value: String(loc.number),
        label: `${loc.number}. ${loc.label}`,
      }));
    }
    return [];
  }

  async function runMeterLookup(): Promise<boolean> {
    if (!meterNumber.trim()) {
      setMeterLookupError('Enter a meter number first.');
      return false;
    }
    setMeterLookupLoading(true);
    setMeterLookupError(null);
    setMeterLookup(null);
    try {
      const q = new URLSearchParams({
        meterNumber: meterNumber.trim(),
      });
      const res = await apiFetch(`/issue/public/meter-lookup?${q.toString()}`);
      if (!res.ok) {
        let serverMsg: string | undefined;
        try {
          const raw = await res.text();
          const data = raw ? (JSON.parse(raw) as { message?: string | string[] }) : {};
          const m = data.message;
          serverMsg = Array.isArray(m) ? m.join(', ') : m?.toString();
        } catch {
          /* ignore */
        }
        const is404 = res.status === 404;
        const isGateway = res.status >= 502 && res.status <= 504;
        const fallback =
          mode === 'public'
            ? is404
              ? 'The app could not reach the API (404). Use Vite dev (frontend + proxy), set VITE_API_URL to your backend, or serve the UI from the same host as the API.'
              : isGateway
                ? 'The API server is not running or refused the connection. Start the backend (port 3000 by default) and try again.'
                : 'Could not complete meter lookup. Check your connection and try again.'
            : 'Lookup failed. You can still submit without it.';
        setMeterLookupError(serverMsg?.trim() ? `${fallback} (${serverMsg})` : fallback);
        return false;
      }
      const j = await parseJson<PremiseMeterLookupResponse>(res);
      setMeterLookup(j);
      if (!j.found) {
        setMeterLookupError(
          mode === 'public'
            ? 'Invalid meter number. This meter is not in the official registry — please verify and try again.'
            : 'No registry match for this meter number yet.',
        );
        return false;
      }
      applyPremiseFromLookup(j);
      return true;
    } catch {
      setMeterLookupError('Network error during lookup.');
      return false;
    } finally {
      setMeterLookupLoading(false);
    }
  }

  async function advanceConversation(): Promise<void> {
    const step = currentBotStep;
    if (!step) return;
    if (mode === 'public') {
      if (step.id === 'registryMeter') {
        setPendingBotAction(true);
        try {
          const ok = await runMeterLookup();
          if (!ok) return;
          setMeterVerificationId('');
          setMeterVerifySessionId('');
          setDemoOtpHint(null);
          setOtpCode('');
          setMeterLookupError(null);
          setAccountConfirmChoice('');
          setPhoneSuffixChoice('');
          setMaintenanceDeclined(false);
          setConversationAborted(false);
          setFlowStatusMessage(null);
          setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        } finally {
          setPendingBotAction(false);
        }
        return;
      }
      if (step.id === 'accountConfirm') {
        if (accountConfirmChoice === 'incorrect') {
          setMeterLookupError(
            'Account details are incorrect. Please verify your meter number or contact customer service.',
          );
          setMeterNumber('');
          setMeterLookup(null);
          setAccountConfirmChoice('');
          setPhoneSuffixChoice('');
          setBotStepIndex(0);
          return;
        }
        setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        return;
      }
      if (step.id === 'registryPhoneSuffix') {
        if (phoneSuffixChoice === 'no') {
          setMeterLookupError(
            'The registered number does not match. Please verify your meter number or contact customer service.',
          );
          setPhoneSuffixChoice('');
          setAccountConfirmChoice('');
          setMeterNumber('');
          setMeterLookup(null);
          setBotStepIndex(0);
          return;
        }
        setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        return;
      }
      if (step.id === 'wsNeighboursAffected') {
        const msg = neighboursClusterMessage(issueAttributes.neighboursSameIssue ?? '');
        setFlowStatusMessage(msg);
        setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        return;
      }
      if (step.id === 'wsPhotoEvidence' || step.id === 'catPhotoEvidence') {
        if (evidenceFile) {
          setIssueAttributes((prev) => ({
            ...prev,
            evidenceFileName: evidenceFile.name,
            catPhotoIntent: prev.catPhotoIntent ?? prev.photoIntent,
          }));
        }
        setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        return;
      }
      if (step.id === 'wsMaintenanceStillReport') {
        if ((issueAttributes.maintenanceStillReport ?? '') === 'no') {
          setConversationAborted(true);
          setFlowStatusMessage(
            'Understood. If your supply is restored after scheduled maintenance, no further report is needed.',
          );
          setBotStepIndex(botSteps.length);
          return;
        }
        setIssueAttributes((prev) => ({ ...prev, maintenanceLinked: 'yes' }));
        setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        return;
      }
      if (step.id === 'registryPhone') {
        if (!reporterPhone.trim()) return;
        setPendingBotAction(true);
        try {
          const res = await apiFetch('/issue/public/meter-verify/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meterNumber: meterNumber.trim(),
              phone: reporterPhone.trim(),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msg = (data as { message?: string | string[] }).message;
            throw new Error(
              Array.isArray(msg) ? msg.join(', ') : msg?.toString() ?? 'Verification start failed',
            );
          }
          const j = data as MeterVerifyStartResponse;
          setMeterVerifySessionId(j.verificationId);
          setDemoOtpHint(j.demoOtp ?? null);
          setOtpCode('');
          setMeterLookupError(null);
          setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        } catch (err) {
          setMeterLookupError(
            err instanceof Error ? err.message : 'Could not start phone verification.',
          );
        } finally {
          setPendingBotAction(false);
        }
        return;
      }
      if (step.id === 'registryOtp') {
        if (!meterVerifySessionId.trim()) {
          setMeterLookupError('Request a code first (previous step).');
          return;
        }
        setPendingBotAction(true);
        try {
          const res = await apiFetch('/issue/public/meter-verify/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              verificationId: meterVerifySessionId.trim(),
              meterNumber: meterNumber.trim(),
              otp: otpCode.trim(),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msg = (data as { message?: string | string[] }).message;
            throw new Error(
              Array.isArray(msg) ? msg.join(', ') : msg?.toString() ?? 'Invalid code',
            );
          }
          const j = data as { meterVerificationId?: string };
          if (j.meterVerificationId) {
            setMeterVerificationId(j.meterVerificationId);
          }
          setDemoOtpHint(null);
          setMeterLookupError(null);
          setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
        } catch (err) {
          setMeterLookupError(
            err instanceof Error ? err.message : 'Verification failed.',
          );
        } finally {
          setPendingBotAction(false);
        }
        return;
      }
    }
    setBotStepIndex((x) => Math.min(botSteps.length, x + 1));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const mappedAttrs =
        mode === 'public'
          ? mapPublicIssueAttributes(
              issueCategory,
              issueSubcategory,
              issueAttributes,
              meterLookup,
            )
          : issueAttributes;
      const attrs: Record<string, string | number> = {};
      const schema = ATTRIBUTE_SCHEMAS[issueSubcategory] ?? [];
      for (const field of schema) {
        const raw = mappedAttrs[field.key];
        if (!raw || !raw.trim()) continue;
        attrs[field.key] =
          field.type === 'number' ? Number(raw.trim()) : raw.trim();
      }
      let districtNum = publicDistrictNumber;
      if (mode === 'public' && !districtNum && meterLookup?.district && districtRows.length > 0) {
        const dNorm = meterLookup.district.trim().toUpperCase();
        const row = districtRows.find(
          (d) => d.name.toUpperCase() === dNorm || d.code.toUpperCase() === dNorm,
        );
        if (row) districtNum = String(row.number);
      }
      const districtRow = districtRows.find((d) => String(d.number) === districtNum);
      const locationRow = locationRows.find(
        (d) => String(d.number) === publicLocationNumber,
      );
      const body = {
        description,
        issueCategory,
        issueSubcategory,
        severityLevel,
        urgencyLevel,
        accountNumber: accountNumber.trim() || undefined,
        affectedScope,
        issueAttributes: Object.keys(attrs).length > 0 ? attrs : undefined,
        meterNumber: meterNumber.trim() || undefined,
        meterVerificationId:
          mode === 'public' && meterVerificationId.trim()
            ? meterVerificationId.trim()
            : undefined,
        reportDistrictNumber:
          mode === 'public' && districtNum ? Number(districtNum) : undefined,
        reportDistrictName: districtRow?.name,
        reportLocationNumber:
          mode === 'public' && publicLocationNumber
            ? Number(publicLocationNumber)
            : undefined,
        reportLocationName: locationRow?.label,
        reportLocationDetail: mode === 'public' ? addressDescription.trim() : undefined,
        reportChannel: mode === 'public' ? 'web' : reportChannel,
        dateReported: new Date().toISOString(),
        reporterName,
        reporterPhone,
        reporterEmail: reporterEmail.trim() || undefined,
        location: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          addressDescription,
          serviceArea: serviceArea.trim() || undefined,
        },
      };
      const path = mode === 'public' ? '/issue/public' : '/issue';
      const res = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() ||
            'Create failed',
        );
      }
      const issue = await parseJson<PublicIssueCreateResult>(res);
      if (mode === 'public') {
        rememberComplaint({
          issueRef: issueKey(issue.id),
          reporterPhone: reporterPhone.trim(),
          createdAt: new Date().toISOString(),
          category: issueCategory,
        });
        const photo =
          evidenceFile &&
          (issueAttributes.photoIntent === 'upload' ||
            issueAttributes.catPhotoIntent === 'upload');
        if (photo && evidenceFile) {
          const fd = new FormData();
          fd.append('file', evidenceFile);
          fd.append('meterNumber', meterNumber.trim());
          fd.append('reporterPhone', reporterPhone.trim());
          const up = await apiFetch(`/issue/public/attachments/${issue.id}`, {
            method: 'POST',
            body: fd,
          });
          if (!up.ok) {
            console.warn('Evidence upload failed', await up.text());
          }
        }
        setPublicCreateResult(issue);
      }
      setCreatedId(issue.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setPending(false);
    }
  }

  const publicPriorityLabel =
    mode === 'public' && issueCategory === 'water_supply'
      ? calculateWaterSupplyPriority(issueSubcategory, issueAttributes).label
      : mode === 'public'
        ? severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1)
        : null;

  if (createdId != null) {
    const createdRef = issueKey(createdId);
    const displayRef =
      publicCreateResult?.publicReference ??
      (mode === 'public' && issueCategory === 'water_supply'
        ? publicWaterSupplyRef(createdId)
        : createdRef);

    if (mode === 'public') {
      return (
        <PublicReportSuccess
          issueId={createdId}
          displayRef={displayRef}
          trackPhone={reporterPhone.trim()}
          assignment={publicCreateResult?.assignment ?? null}
          priorityLabel={publicPriorityLabel ?? 'Standard'}
        />
      );
    }

    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Issue created</p>
        <p className="mt-2 text-slate-600">
          Reference <span className="font-semibold text-indigo-700">{displayRef}</span>
        </p>
        <Link
          to="/app/issues"
          className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          Back to backlog
        </Link>
      </div>
    );
  }

  const isConversationComplete = botStepIndex >= botSteps.length;
  const completionPercent = Math.round((botStepIndex / botSteps.length) * 100);
  const publicWaterReady =
    issueCategory === 'water_supply'
      ? Boolean(issueSubcategory.trim() && (issueAttributes.affectedArea?.trim() ?? ''))
      : Boolean(issueSubcategory.trim() && description.trim());

  const hasCoreValues =
    !conversationAborted &&
    issueCategory.trim() &&
    (mode === 'public' || issueSubcategory.trim()) &&
    (mode !== 'public' ? issueSubcategory.trim() : true) &&
    description.trim() &&
    reporterName.trim() &&
    reporterPhone.trim() &&
    addressDescription.trim() &&
    (mode === 'public' ? publicWaterReady : true) &&
    (mode === 'public' || (latitude.trim() && longitude.trim())) &&
    (mode !== 'public' || meterVerificationId.trim());

  const canSubmit = Boolean(isConversationComplete && hasCoreValues && !pending);

  return (
    <div className={mode === 'public' ? 'mx-auto max-w-4xl' : 'mx-auto max-w-7xl'}>
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5 shadow-sm">
        <div className={mode === 'public' ? '' : 'grid gap-6 lg:grid-cols-3'}>
          <form
            onSubmit={onSubmit}
            className={mode === 'public' ? 'space-y-5' : 'space-y-5 lg:col-span-2'}
          >
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      aria-expanded={categoryDrawerOpen}
                      aria-controls="complaint-category-drawer"
                      onClick={() => setCategoryDrawerOpen(true)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      title="Browse all complaint types"
                    >
                      <Menu className="h-5 w-5" aria-hidden />
                    </button>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      WB
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-lg font-semibold text-slate-900">
                        Utility Operations Assistant
                      </h1>
                      <p className="text-xs text-emerald-600">
                        {mode === 'public'
                          ? 'Water Board Smart Support · guided reporting'
                          : 'Enterprise service desk · staff-assisted intake'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {completionPercent}% complete
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                {mode !== 'public' && (
                  <OperationalBriefingPanel
                    briefing={operationalBriefing}
                    severity={recommendedPriority.severity}
                    urgency={recommendedPriority.urgency}
                    scope={recommendedPriority.scope}
                    triageReason={recommendedPriority.reason}
                    onApplyRedirect={applyCategoryRedirect}
                  />
                )}
              </div>

              <div className="max-h-[540px] space-y-4 overflow-y-auto p-4">
                {botSteps.slice(0, Math.min(botStepIndex + 1, botSteps.length)).map((step, idx) => (
                  <div key={step.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800">
                        {mode === 'public' ? step.prompt : formatStepPrompt(step, idx + 1)}
                      </div>
                    </div>
                    {idx < botStepIndex && (
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <div className="max-w-2xl rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-3 text-sm text-white">
                            {optionLabel(step.id, getBotValue(step.id))}
                          </div>
                        </div>
                        {step.id === 'registryMeter' && meterLookup?.found && (
                          <PremiseRegistryCard lookup={meterLookup} />
                        )}
                      </div>
                    )}
                    {idx < botStepIndex &&
                      step.id === 'wsNeighboursAffected' &&
                      flowStatusMessage && (
                        <div className="flex items-start gap-2">
                          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-500" />
                          <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                            {flowStatusMessage}
                          </div>
                        </div>
                      )}
                  </div>
                ))}

                {isConversationComplete && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <p className="flex items-center gap-2 font-semibold">
                      <CircleCheck className="h-4 w-4" />
                      {conversationAborted
                        ? 'Conversation ended'
                        : 'Directed conversation complete'}
                    </p>
                    <p className="mt-1 text-xs text-emerald-900/90">
                      {conversationAborted
                        ? flowStatusMessage
                        : mode === 'public'
                          ? 'Use Submit complaint below to send your report.'
                          : 'Review optional fields, validate meter if available, then submit.'}
                    </p>

                  </div>
                )}
                {mode !== 'public' && isEmergencySubcategory(issueSubcategory) && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                    <p className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Emergency escalation engaged
                    </p>
                    <p className="mt-1 text-xs text-rose-900/90">
                      {operationalBriefing.escalationLabel} — dispatch lane:{' '}
                      {operationalBriefing.dispatchLane}
                    </p>
                  </div>
                )}
                <div ref={chatEndRef} className="h-1 shrink-0" aria-hidden />
              </div>

              {!isConversationComplete && (
              <div className="border-t border-slate-100 p-4">
                {currentBotStep && (
                  <div className="space-y-3">
                    {(mode === 'public'
                      ? currentBotStep.helperText
                      : [currentBotStep.helperText, stepOperationalOverlay.helperSuffix]
                          .filter(Boolean)
                          .join(' ')) && (
                      <p className="text-xs text-slate-500">
                        {mode === 'public'
                          ? currentBotStep.helperText
                          : [currentBotStep.helperText, stepOperationalOverlay.helperSuffix]
                              .filter(Boolean)
                              .join(' ')}
                      </p>
                    )}
                    {mode === 'public' &&
                      currentBotStep.id === 'registryPhone' &&
                      meterLookup?.phoneHintLast4 && (
                        <p className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-950">
                          You confirmed the number ending in{' '}
                          <span className="font-semibold">
                            {meterLookup.phoneHintLast4.replace(/^…+/, '')}
                          </span>
                          . Enter the complete mobile number below.
                        </p>
                      )}
                    {currentBotStep.type === 'select' ? (
                      <div className="space-y-2">
                        {currentBotStep.id === 'issueCategory' && (
                          <p className="text-xs text-slate-500">
                            Use the menu button above for a full scrollable list, or choose a
                            shortcut below.
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {stepOptions(currentBotStep.id).map((opt) => {
                            const active = getBotValue(currentBotStep.id) === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setBotValue(currentBotStep.id, opt.value)}
                                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                                  active
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        {mode === 'public' &&
                          (currentBotStep.id === 'wsPhotoEvidence' ||
                            currentBotStep.id === 'catPhotoEvidence') &&
                          (issueAttributes.photoIntent === 'upload' ||
                            issueAttributes.catPhotoIntent === 'upload') && (
                            <div className="space-y-2">
                              <input
                                ref={evidenceInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0] ?? null;
                                  setEvidenceFile(f);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => evidenceInputRef.current?.click()}
                                className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-50"
                              >
                                {evidenceFile
                                  ? `Selected: ${evidenceFile.name}`
                                  : 'Choose photo (JPEG, PNG, WebP)'}
                              </button>
                              <p className="text-xs text-slate-500">
                                Photo is uploaded securely with your report for field crews.
                              </p>
                            </div>
                          )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type={stepAttributeType(currentBotStep.id) === 'number' ? 'number' : 'text'}
                          value={getBotValue(currentBotStep.id)}
                          onChange={(e) => setBotValue(currentBotStep.id, e.target.value)}
                          placeholder={
                            currentBotStep.optional
                              ? 'Optional response...'
                              : 'Type your response...'
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none ring-indigo-500 focus:ring-2"
                        />
                        {mode !== 'public' &&
                        (currentBotStep.id === 'meterNumber' ||
                          currentBotStep.id === 'registryMeter') ? (
                          <button
                            type="button"
                            onClick={() => void runMeterLookup()}
                            disabled={meterLookupLoading || !meterNumber.trim()}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                          >
                            {meterLookupLoading ? 'Validating meter…' : 'Validate meter now'}
                          </button>
                        ) : null}
                      </div>
                    )}
                    {demoOtpHint && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
                        Prototype OTP code: <span className="font-mono">{demoOtpHint}</span>
                      </div>
                    )}
                    {meterLookupError && (
                      <p className="text-xs text-rose-700">{meterLookupError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBotStepIndex((x) => Math.max(0, x - 1))}
                        disabled={botStepIndex === 0}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => void advanceConversation()}
                        disabled={
                          pendingBotAction ||
                          !isStepSatisfied(currentBotStep) ||
                          (currentBotStep.id === 'publicLocation' && locationRows.length === 0)
                        }
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {botStepIndex === botSteps.length - 1 ? 'Finish conversation' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>

            {mode !== 'public' && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">
                  Structured complaint data (subcategory specific)
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(ATTRIBUTE_SCHEMAS[issueSubcategory] ?? []).map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium text-slate-600">
                        {field.label}
                        {field.required ? ' *' : ''}
                      </label>
                      <input
                        required={field.required}
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={issueAttributes[field.key] ?? ''}
                        onChange={(e) =>
                          setIssueAttributes((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isConversationComplete && mode !== 'public' && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm text-slate-800">
                <p className="font-semibold text-indigo-900">Meter / premise (optional)</p>
                <p className="mt-1 text-xs text-slate-600">
                  If you enter your meter number, we can match your account and supply zone where
                  the registry has a record (demo: try WB-DEMO-1001).
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <label className="text-xs font-medium text-slate-600">Meter number</label>
                    <input
                      value={meterNumber}
                      onChange={(e) => {
                        setMeterNumber(e.target.value);
                        setMeterLookup(null);
                        setMeterLookupError(null);
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="e.g. WB-DEMO-1001"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={meterLookupLoading || !meterNumber.trim()}
                    onClick={() => void runMeterLookup()}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {meterLookupLoading ? 'Looking up…' : 'Look up'}
                  </button>
                </div>
                {meterLookupError && (
                  <p className="mt-2 text-xs text-amber-800">{meterLookupError}</p>
                )}
                {meterLookup?.found && (
                  <div className="mt-3 rounded-lg border border-white bg-white/80 p-3 text-xs text-slate-800">
                    <p className="font-semibold text-slate-900">Registry match</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {meterLookup.customerName && <li>Name: {meterLookup.customerName}</li>}
                      {meterLookup.accountNumber && <li>Account: {meterLookup.accountNumber}</li>}
                      {meterLookup.serviceArea && <li>Service area: {meterLookup.serviceArea}</li>}
                      {meterLookup.supplyZone && <li>Supply zone: {meterLookup.supplyZone}</li>}
                      {meterLookup.physicalAddress && <li>Address: {meterLookup.physicalAddress}</li>}
                    </ul>
                    <button
                      type="button"
                      className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      onClick={() => {
                        if (meterLookup.accountNumber) {
                          setAccountNumber(meterLookup.accountNumber);
                        }
                        if (meterLookup.serviceArea) {
                          setServiceArea(meterLookup.serviceArea);
                        }
                        if (
                          meterLookup.latitude != null &&
                          meterLookup.longitude != null
                        ) {
                          setLatitude(String(meterLookup.latitude));
                          setLongitude(String(meterLookup.longitude));
                        }
                      }}
                    >
                      Apply suggested account & zone to this report
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {pending
                  ? 'Saving…'
                  : mode === 'public'
                    ? 'Submit complaint'
                    : 'Create issue from conversation'}
              </button>
              <Link
                to={mode === 'public' ? '/report' : '/app/issues'}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {mode === 'public' ? 'Back to home' : 'Cancel'}
              </Link>
            </div>
          </form>

          {mode !== 'public' && (
            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Live draft summary
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Category:</span>{' '}
                    {issueCategory.replace(/_/g, ' ')}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Subcategory:</span>{' '}
                    {issueSubcategory.replace(/_/g, ' ')}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Severity/Urgency:</span>{' '}
                    {severityLevel} / {urgencyLevel}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Reporter:</span>{' '}
                    {reporterName || '—'} ({reporterPhone || '—'})
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Location:</span>{' '}
                    {addressDescription || '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Coordinates:</span>{' '}
                    {latitude || '—'}, {longitude || '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Optional details
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Reporter email
                    </label>
                    <input
                      type="email"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Account number
                    </label>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Service area
                    </label>
                    <input
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {categoryDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-slate-900/40 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complaint-category-drawer-title"
          onClick={() => setCategoryDrawerOpen(false)}
        >
          <div
            id="complaint-category-drawer"
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2
                id="complaint-category-drawer-title"
                className="text-base font-semibold text-slate-900"
              >
                Complaint types
              </h2>
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Choose the category that best matches the issue. You can change this later
              from the menu; if you already answered questions, the assistant restarts from
              the beginning.
            </p>
            <nav className="flex-1 overflow-y-auto py-2" aria-label="Issue categories">
              <ul className="divide-y divide-slate-100">
                {CATEGORY_OPTIONS.map((cat) => {
                  const selected = issueCategory === cat.value;
                  return (
                    <li key={cat.value}>
                      <button
                        type="button"
                        onClick={() => pickCategoryFromDrawer(cat.value)}
                        className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-indigo-50 ${
                          selected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''
                        }`}
                      >
                        <span
                          className={`font-semibold ${selected ? 'text-indigo-900' : 'text-slate-900'}`}
                        >
                          {cat.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {cat.subcategories.length} specific types — first:{' '}
                          {cat.subcategories[0]?.replace(/_/g, ' ') ?? '—'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
          <div className="min-h-0 min-w-0 flex-1" aria-hidden />
        </div>
      )}
    </div>
  );
}
