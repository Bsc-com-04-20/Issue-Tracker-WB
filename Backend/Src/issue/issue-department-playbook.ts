/**
 * Department handling playbooks: who typically owns work, common co-involvement,
 * and issue patterns (aligned with ISSUE_CLASSIFICATION categories).
 */

export type DepartmentPlaybookCoDepartment = {
  departmentKey: string;
  label: string;
  when: string;
};

export type DepartmentPlaybookDto = {
  category: string;
  primaryDepartmentKey: string;
  primaryDepartmentLabel: string;
  mission: string;
  typicalIssues: string[];
  coDepartments: DepartmentPlaybookCoDepartment[];
  resolutionActors: string[];
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  operations_department: 'Operations',
  maintenance_department: 'Maintenance & distribution',
  billing_department: 'Billing & accounts',
  metering_unit: 'Metering',
  water_quality_unit: 'Water quality',
  ict_digital_services_department: 'ICT & digital services',
  inspection_compliance_unit: 'Inspection & compliance',
};

const PLAYBOOKS: Record<string, DepartmentPlaybookDto> = {
  water_supply: {
    category: 'water_supply',
    primaryDepartmentKey: 'operations_department',
    primaryDepartmentLabel: DEPARTMENT_LABELS.operations_department,
    mission:
      'Operations owns the customer supply experience: pressure, continuity, and restoration after planned or emergency work — coordinated with SCADA/zone models where the utility uses them.\n\n' +
      'Typical board workflow after a report:\n' +
      '1) Intake validates category, captures location, scope (property vs neighbours), and any known outage or work order reference.\n' +
      '2) Operations control checks zone status, valves, and known outages; if symptoms match a network event, customers are updated and work is tracked to completion.\n' +
      '3) If a mains asset is implicated (burst, valve, hydrant, tank), Maintenance leads repair while Operations manages isolation and re-supply sequencing.\n' +
      '4) If discolouration or taste appears after disturbance, Water quality advises flushing or sampling before closure.\n' +
      '5) If supply stops only at one property while the zone is pressurised, Metering may verify curb stop / meter / internal restriction before billing or customer plumbing is blamed.\n' +
      '6) Supervisor prioritises life-line premises (clinics, schools) and large outages; field staff move the ticket to resolved when supply is verified; supervisor or unit officer closes after customer communication where policy requires.',
    typicalIssues: [
      'Complete loss of supply at a property',
      'Intermittent supply (on/off through the day)',
      'Low pressure at all taps',
      'Low pressure only at peak demand',
      'Air in pipes / spluttering taps',
      'Supply not restored after scheduled maintenance',
      'Supply not restored after emergency repair nearby',
      'Suspected wrong valve configuration affecting a street',
      'Bulk / tanker supply coordination after major outage',
      'School or clinic supply priority escalation',
      'Neighbourhood-wide outage report',
      'Pressure surge complaints after network changes',
    ],
    coDepartments: [
      {
        departmentKey: 'maintenance_department',
        label: DEPARTMENT_LABELS.maintenance_department,
        when: 'Burst, leak, or asset failure is confirmed or suspected on mains, valves, or hydrants.',
      },
      {
        departmentKey: 'water_quality_unit',
        label: DEPARTMENT_LABELS.water_quality_unit,
        when: 'Discolouration, taste, or odour after disturbance or outage (flush / sampling plan).',
      },
      {
        departmentKey: 'metering_unit',
        label: DEPARTMENT_LABELS.metering_unit,
        when: 'Supply symptoms may be caused by stopped or bypassed customer meter / curb stop.',
      },
    ],
    resolutionActors: [
      'Intake officer — category, location, scope, duplicates, escalation flags',
      'Department officer (operations) — zone checks, valve programme, customer updates on supply incidents',
      'Supervisor — priority, major outage or multi-property coordination',
      'Technician — field verification, pressure checks, handover to maintenance when needed',
      'Maintenance — mains and asset repair when the fault is on the network',
      'Metering — curb stop, meter, or single-property isolation when the network is healthy',
      'Water quality — post-event flush or sampling guidance when colour/taste is reported',
      'Supervisor or admin — closure after verified restoration and messaging',
    ],
  },
  infrastructure_maintenance: {
    category: 'infrastructure_maintenance',
    primaryDepartmentKey: 'maintenance_department',
    primaryDepartmentLabel: DEPARTMENT_LABELS.maintenance_department,
    mission:
      'Repair and maintain physical water assets (mains, service lines, valves, hydrants, storage) to stop loss, restore service, and protect public safety.',
    typicalIssues: [
      'Visible burst or major leak',
      'Slow leak in road or verge',
      'Damaged boundary valve',
      'Broken or leaking hydrant',
      'Reservoir or tank damage or vandalism',
      'Damage from suspected illegal connection',
      'Meter chamber / infrastructure damage',
      'Service line leak (utility vs customer side determination)',
      'Reinstatement defects after excavation',
      'Repeated failure at same location',
      'Third-party contractor damage to mains',
      'Fire flow / hydrant access blocked',
    ],
    coDepartments: [
      {
        departmentKey: 'operations_department',
        label: DEPARTMENT_LABELS.operations_department,
        when: 'Isolation, re-zoning, or supply restoration sequencing is needed.',
      },
      {
        departmentKey: 'water_quality_unit',
        label: DEPARTMENT_LABELS.water_quality_unit,
        when: 'Post-repair flushing, sampling, or customer advisory is required.',
      },
      {
        departmentKey: 'billing_department',
        label: DEPARTMENT_LABELS.billing_department,
        when: 'Leak-driven consumption or property damage claims tie to the account.',
      },
      {
        departmentKey: 'inspection_compliance_unit',
        label: DEPARTMENT_LABELS.inspection_compliance_unit,
        when: 'Damage suggests theft, bypass, or unauthorised work.',
      },
      {
        departmentKey: 'metering_unit',
        label: DEPARTMENT_LABELS.metering_unit,
        when: 'Damage is centred on the meter assembly, boundary meter, or meter chamber (not only generic pipe).',
      },
    ],
    resolutionActors: [
      'Customer service — intake and public liaison',
      'Supervisor — safety prioritisation and crew dispatch',
      'Maintenance technician — field repair and evidence',
      'Water quality — sampling if mandated',
      'Supervisor / admin — closure and reinstatement sign-off',
    ],
  },
  billing_account: {
    category: 'billing_account',
    primaryDepartmentKey: 'billing_department',
    primaryDepartmentLabel: DEPARTMENT_LABELS.billing_department,
    mission:
      'Billing department (category: billing / account). What they fix: account, charges, payments, estimated reads, disputes, reconnection rules—not the pipe, unless investigation proves leak-driven usage.\n\n' +
      'How to handle (aligned with common utility practice): Tier 1 CS captures facts, bill period, and meter read type. Billing analyst validates reads, adjustment rules, and leak-credits policy (many cities document review/escalation paths; see Baltimore bill review). If the cause is physical, request a metering field visit or maintenance leak confirmation—then billing applies the correct financial remedy.\n\n' +
      'Fixed means: ledger correct, customer informed, and reconnection executed if applicable.',
    typicalIssues: [
      'Estimated bill dispute',
      'Duplicate charges',
      'Payment not reflected',
      'Wrong account mapping / merged accounts',
      'Balance dispute after meter change',
      'Tariff / subsidy eligibility questions',
      'Reconnection timing after payment',
      'High bill after leak (often needs meter test / leak investigation first)',
      'Landlord–tenant bill responsibility disputes',
      'Statement reference mismatch',
      'Refund / credit processing',
      'Payment plan / arrears arrangement (policy-governed)',
    ],
    coDepartments: [
      {
        departmentKey: 'metering_unit',
        label: DEPARTMENT_LABELS.metering_unit,
        when: 'Read verification, estimated-read challenge, meter test, access visit, or register behaviour affects the bill.',
      },
      {
        departmentKey: 'maintenance_department',
        label: DEPARTMENT_LABELS.maintenance_department,
        when: 'Underground or service-line leak must be confirmed (or ruled out) before leak-driven consumption or leak credits are applied.',
      },
      {
        departmentKey: 'ict_digital_services_department',
        label: DEPARTMENT_LABELS.ict_digital_services_department,
        when: 'Payment channel, portal, mobile-money sync, or integration failure caused the mismatch.',
      },
    ],
    resolutionActors: [
      'Tier 1 CS — captures facts, bill period, meter read type.',
      'Billing analyst — validates reads, adjustment rules, leak-credits policy; many cities document review/escalation paths (see Baltimore bill review).',
      'Metering or maintenance — if cause is physical, field visit or leak confirmation; then billing applies the financial remedy.',
      'ICT & digital services — payment channel or sync failures that are not resolved by a meter visit alone.',
      'Supervisor / policy — escalations after analyst review, tariff or payment-plan limits.',
      'Fixed — ledger correct, customer informed, reconnection executed if applicable; supervisor or admin closes when complete.',
    ],
  },
  metering: {
    category: 'metering',
    primaryDepartmentKey: 'metering_unit',
    primaryDepartmentLabel: DEPARTMENT_LABELS.metering_unit,
    mission:
      'Ensure accurate measurement and customer interface (meters, prepaid, CIU); escalate tampering or theft to compliance.',
    typicalIssues: [
      'Faulty or stopped meter',
      'Meter runs with no consumption',
      'Prepaid token or vendor sync failure',
      'CIU / keypad failure',
      'Suspected tampering or seal damage',
      'Meter leakage',
      'No access to meter for scheduled read',
      'Meter size or classification error',
      'New meter commissioning defect',
      'Electronic register erratic after surge',
      'Bulk vs domestic meter configuration',
      'Post-repair meter not registering',
    ],
    coDepartments: [
      {
        departmentKey: 'billing_department',
        label: DEPARTMENT_LABELS.billing_department,
        when: 'Register change affects billing periods, credits, or reconnection.',
      },
      {
        departmentKey: 'inspection_compliance_unit',
        label: DEPARTMENT_LABELS.inspection_compliance_unit,
        when: 'Bypass, magnet, or theft pattern is suspected.',
      },
      {
        departmentKey: 'ict_digital_services_department',
        label: DEPARTMENT_LABELS.ict_digital_services_department,
        when: 'Token, SMS, or vendor integration is at fault.',
      },
    ],
    resolutionActors: [
      'Customer service — appointments and access',
      'Metering technician — field test, seal, replacement',
      'Billing — account alignment after register change',
      'Compliance — investigation if tampering',
      'Supervisor / admin — closure',
    ],
  },
  water_quality: {
    category: 'water_quality',
    primaryDepartmentKey: 'water_quality_unit',
    primaryDepartmentLabel: DEPARTMENT_LABELS.water_quality_unit,
    mission:
      'Investigate aesthetic and health-related water concerns; sampling, flushing advisories, and coordination with operations and maintenance on causes and fixes.',
    typicalIssues: [
      'Brown or cloudy water',
      'Chemical or earthy smell',
      'Unusual taste',
      'High chlorine perception',
      'Suspected contamination (priority)',
      'Silt after mains disturbance',
      'First-draw only discolouration vs persistent',
      'Sensitive site (school, clinic, hospital)',
      'Neighbourhood pattern complaints',
      'Storage or tank related concern',
      'Customer education vs genuine exceedance',
      'Post-outage flush programme coordination',
    ],
    coDepartments: [
      {
        departmentKey: 'operations_department',
        label: DEPARTMENT_LABELS.operations_department,
        when: 'Zone flushing, operational adjustment, or outage communication is needed.',
      },
      {
        departmentKey: 'maintenance_department',
        label: DEPARTMENT_LABELS.maintenance_department,
        when: 'Cause is recent repair, corrosion, or intrusion on the network.',
      },
      {
        departmentKey: 'billing_department',
        label: DEPARTMENT_LABELS.billing_department,
        when: 'Goodwill or rebate policy applies after verified event.',
      },
    ],
    resolutionActors: [
      'Customer service — intake and triage',
      'Water quality officer — sampling plan and lab chain',
      'Operations — flushing / zone actions',
      'Maintenance — corrective works if structural',
      'Supervisor / regulator liaison — if thresholds implicated',
      'Admin — closure and customer notification',
    ],
  },
  digital_payment: {
    category: 'digital_payment',
    primaryDepartmentKey: 'ict_digital_services_department',
    primaryDepartmentLabel: DEPARTMENT_LABELS.ict_digital_services_department,
    mission:
      'Restore digital channels, integrations, and payment flows; reconcile with billing when money movement is affected.',
    typicalIssues: [
      'Mobile money sync failure',
      'Online payment succeeded but not posted',
      'Customer portal login or session failure',
      'SMS or OTP delivery failure',
      'Prepaid token generation outage',
      'Planned or unplanned system downtime',
      'Incorrect tariff display online',
      'Third-party vendor API outage',
      'Security incident (credential abuse)',
      'CIS vs channel data mismatch',
      'USSD / short-code handset compatibility',
      'Reporting dashboard error for management',
    ],
    coDepartments: [
      {
        departmentKey: 'billing_department',
        label: DEPARTMENT_LABELS.billing_department,
        when: 'Customer account must be adjusted or payment manually reconciled.',
      },
      {
        departmentKey: 'metering_unit',
        label: DEPARTMENT_LABELS.metering_unit,
        when: 'Token or vendor path ties to specific meter vendor integration.',
      },
    ],
    resolutionActors: [
      'ICT — incident response and vendor coordination',
      'Billing — reconciliation and customer credit',
      'Customer service — communication and workaround',
      'Supervisor — priority and external comms',
      'Admin — post-incident closure',
    ],
  },
  illegal_connection_fraud: {
    category: 'illegal_connection_fraud',
    primaryDepartmentKey: 'inspection_compliance_unit',
    primaryDepartmentLabel: DEPARTMENT_LABELS.inspection_compliance_unit,
    mission:
      'Investigate unauthorised use, tampering, and theft; secure evidence, apply penalties and disconnection policy, coordinate physical removal with maintenance.',
    typicalIssues: [
      'Reported illegal connection',
      'Meter bypass',
      'Water theft or unauthorised resale',
      'Tampering with board infrastructure',
      'Broken seals without legitimate visit',
      'Contractor unauthorised tie-in',
      'Repeat offender same property',
      'Landlord enabling illegal subdivisions',
      'Damage during enforcement access',
      'Police or local authority coordination',
      'False documentation in application',
      'Informant-led investigation',
    ],
    coDepartments: [
      {
        departmentKey: 'maintenance_department',
        label: DEPARTMENT_LABELS.maintenance_department,
        when: 'Physical removal, isolation, or safe reinstatement is required.',
      },
      {
        departmentKey: 'metering_unit',
        label: DEPARTMENT_LABELS.metering_unit,
        when: 'Measurement of loss, replacement meter, or seal programme.',
      },
      {
        departmentKey: 'billing_department',
        label: DEPARTMENT_LABELS.billing_department,
        when: 'Back-billing, penalties, or payment settlement.',
      },
      {
        departmentKey: 'operations_department',
        label: DEPARTMENT_LABELS.operations_department,
        when: 'Supply restoration for compliant portion of premises.',
      },
    ],
    resolutionActors: [
      'Compliance / inspection officer — investigation and file',
      'Legal — penalties and prosecution path',
      'Maintenance — physical remediation',
      'Billing — charges and recovery',
      'Supervisor — safety and escalation',
      'Admin — closure after compliance satisfied',
    ],
  },
};

export function getDepartmentPlaybook(
  issueCategory: string,
): DepartmentPlaybookDto | null {
  return PLAYBOOKS[issueCategory] ?? null;
}

function allowedCoKeysFor(category: string): Set<string> {
  const p = PLAYBOOKS[category];
  return new Set((p?.coDepartments ?? []).map((c) => c.departmentKey));
}

function addCo(
  out: Set<string>,
  category: string,
  ...departmentKeys: string[]
): void {
  const allowed = allowedCoKeysFor(category);
  for (const k of departmentKeys) {
    if (allowed.has(k)) {
      out.add(k);
    }
  }
}

/**
 * Subcategory-aware co-department hints (only keys listed on the category playbook).
 */
export function suggestCoDepartments(
  issueCategory: string,
  issueSubcategory: string | null,
): string[] {
  const out = new Set<string>();
  const s = (issueSubcategory ?? '').trim();

  switch (issueCategory) {
    case 'water_supply':
      if (s === 'no_water_supply' || s === 'delayed_water_restoration') {
        addCo(out, issueCategory, 'maintenance_department', 'metering_unit');
      }
      if (s === 'intermittent_supply' || s === 'air_in_pipes') {
        addCo(out, issueCategory, 'water_quality_unit');
      }
      if (s === 'low_water_pressure' || s === 'no_water_supply') {
        addCo(out, issueCategory, 'metering_unit');
      }
      break;
    case 'infrastructure_maintenance':
      if (
        s === 'pipe_burst' ||
        s === 'water_leakage' ||
        s === 'damaged_valve' ||
        s === 'broken_hydrant' ||
        s === 'reservoir_or_tank_damage'
      ) {
        addCo(out, issueCategory, 'operations_department', 'water_quality_unit');
      }
      if (s === 'illegal_connection_damage') {
        addCo(
          out,
          issueCategory,
          'inspection_compliance_unit',
          'operations_department',
          'billing_department',
        );
      }
      if (s === 'meter_infrastructure_damage') {
        addCo(
          out,
          issueCategory,
          'metering_unit',
          'operations_department',
          'billing_department',
        );
      }
      break;
    case 'billing_account':
      if (s === 'incorrect_meter_reading') {
        addCo(out, issueCategory, 'metering_unit');
      }
      if (s === 'delayed_reconnection') {
        addCo(out, issueCategory, 'metering_unit', 'ict_digital_services_department');
      }
      if (s === 'estimated_billing_complaint' || s === 'account_balance_dispute') {
        addCo(out, issueCategory, 'metering_unit', 'maintenance_department');
      }
      if (
        s === 'duplicate_charges' ||
        s === 'payment_not_reflected' ||
        s === 'wrong_customer_account_mapping'
      ) {
        addCo(out, issueCategory, 'ict_digital_services_department');
      }
      break;
    case 'metering':
      if (s === 'prepaid_meter_token_failure' || s === 'meter_interface_unit_failure') {
        addCo(out, issueCategory, 'ict_digital_services_department');
      }
      if (
        s === 'faulty_meter' ||
        s === 'meter_running_without_water' ||
        s === 'meter_leakage'
      ) {
        addCo(out, issueCategory, 'billing_department');
      }
      if (s === 'tampered_meter') {
        addCo(out, issueCategory, 'inspection_compliance_unit');
      }
      break;
    case 'water_quality':
      if (s === 'suspected_contamination') {
        addCo(
          out,
          issueCategory,
          'operations_department',
          'maintenance_department',
        );
      }
      if (
        s === 'brown_or_dirty_water' ||
        s === 'bad_smell' ||
        s === 'bad_taste' ||
        s === 'silt_or_mud_presence'
      ) {
        addCo(out, issueCategory, 'operations_department', 'maintenance_department');
      }
      if (s === 'high_chlorine_levels') {
        addCo(out, issueCategory, 'operations_department');
      }
      break;
    case 'digital_payment':
      if (s === 'token_generation_failure' || s === 'sms_notification_failure') {
        addCo(out, issueCategory, 'metering_unit', 'billing_department');
      }
      if (
        s === 'mobile_money_sync_failure' ||
        s === 'failed_online_payment' ||
        s === 'system_downtime'
      ) {
        addCo(out, issueCategory, 'billing_department');
      }
      if (s === 'mobile_money_sync_failure') {
        addCo(out, issueCategory, 'metering_unit');
      }
      if (s === 'customer_portal_login_failure') {
        addCo(out, issueCategory, 'billing_department');
      }
      break;
    case 'illegal_connection_fraud':
      if (s === 'illegal_water_connection') {
        addCo(
          out,
          issueCategory,
          'maintenance_department',
          'operations_department',
          'billing_department',
        );
      }
      if (s === 'meter_bypass') {
        addCo(out, issueCategory, 'metering_unit', 'billing_department');
      }
      if (s === 'water_theft') {
        addCo(
          out,
          issueCategory,
          'metering_unit',
          'billing_department',
          'maintenance_department',
        );
      }
      if (s === 'tampering_with_infrastructure') {
        addCo(out, issueCategory, 'maintenance_department', 'operations_department');
      }
      break;
    default:
      break;
  }

  const primary = PLAYBOOKS[issueCategory]?.primaryDepartmentKey;
  if (primary) {
    out.delete(primary);
  }
  return [...out];
}

export function departmentPlaybooksRecord(): Record<
  string,
  DepartmentPlaybookDto
> {
  return { ...PLAYBOOKS };
}
