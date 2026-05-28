/** Mirrors src/issue/category-work-progress.ts for technician UI. */

export type HandlingLane =
  | 'field'
  | 'billing'
  | 'metering'
  | 'ict'
  | 'quality'
  | 'compliance';

export type WorkProgressOption = { value: string; label: string };

export type CategoryTechnicianWorkflow = {
  lane: HandlingLane;
  progressSectionTitle: string;
  progressSectionHint: string;
  progressOptions: WorkProgressOption[];
  startWorkLabel: string;
  resolveSectionTitle: string;
  resolutionPlaceholder: string;
  resolveButtonLabel: string;
  awaitingClosureBlurb: string;
  progressStripIntro: string;
  progressStripAssigned: string;
  progressStripInProgress: string;
  progressStripResolved: string;
};

const FIELD_PROGRESS: WorkProgressOption[] = [
  { value: 'en_route', label: 'En route' },
  { value: 'on_site', label: 'On site' },
  { value: 'awaiting_materials', label: 'Awaiting materials' },
  { value: 'awaiting_customer', label: 'Awaiting customer' },
  {
    value: 'work_complete_pending_verify',
    label: 'Work complete (pending verify)',
  },
];

const BILLING_PROGRESS: WorkProgressOption[] = [
  { value: 'reviewing_account', label: 'Reviewing account & bill period' },
  { value: 'awaiting_payment_proof', label: 'Awaiting payment proof from customer' },
  { value: 'coordinating_metering', label: 'Coordinating with metering (read test)' },
  { value: 'coordinating_ict', label: 'Coordinating with ICT (payment sync)' },
  { value: 'adjustment_posted', label: 'Ledger adjustment posted' },
  { value: 'customer_notified', label: 'Customer notified of outcome' },
];

const METERING_PROGRESS: WorkProgressOption[] = [
  { value: 'visit_scheduled', label: 'Field visit scheduled' },
  { value: 'en_route', label: 'En route to meter' },
  { value: 'on_site', label: 'On site at meter' },
  { value: 'awaiting_parts', label: 'Awaiting meter / parts' },
  { value: 'register_verified', label: 'Register verified or replaced' },
  { value: 'awaiting_billing_sync', label: 'Awaiting billing account update' },
];

const ICT_PROGRESS: WorkProgressOption[] = [
  { value: 'investigating', label: 'Investigating system / channel logs' },
  { value: 'vendor_ticket', label: 'Vendor or gateway ticket open' },
  { value: 'workaround_applied', label: 'Workaround applied for customer' },
  { value: 'fix_deployed', label: 'Fix deployed — monitoring' },
  { value: 'awaiting_customer_retry', label: 'Awaiting customer retry' },
];

const QUALITY_PROGRESS: WorkProgressOption[] = [
  { value: 'triage', label: 'Initial triage' },
  { value: 'sampling', label: 'Sampling in progress' },
  { value: 'lab_pending', label: 'Awaiting lab results' },
  { value: 'flush_advised', label: 'Flush / advisory issued' },
  { value: 'ops_coordinated', label: 'Operations / maintenance coordinated' },
];

const COMPLIANCE_PROGRESS: WorkProgressOption[] = [
  { value: 'intake_review', label: 'Intake & evidence review' },
  { value: 'site_inspection', label: 'Site inspection scheduled or done' },
  { value: 'awaiting_customer', label: 'Awaiting customer / occupier contact' },
  { value: 'enforcement_action', label: 'Enforcement action in progress' },
  { value: 'referred_billing', label: 'Referred to billing for recovery' },
];

const FIELD_WORKFLOW: CategoryTechnicianWorkflow = {
  lane: 'field',
  progressSectionTitle: 'Field progress',
  progressSectionHint:
    'Sub-status for crews while the ticket is assigned or in progress (visible to supervisors).',
  progressOptions: FIELD_PROGRESS,
  startWorkLabel: 'Start field work',
  resolveSectionTitle: 'Field resolution',
  resolutionPlaceholder:
    'What was done on site (repair, isolation, customer advised, photos referenced…)',
  resolveButtonLabel: 'Mark field work resolved',
  awaitingClosureBlurb:
    'Field work is marked resolved. A supervisor, administrator, or unit department officer may close the ticket.',
  progressStripIntro:
    'Standard path: intake → dispatch → technician field work → resolved → office closed.',
  progressStripAssigned: 'Supervisor assigned a field technician.',
  progressStripInProgress: 'Technician is on site or actively working.',
  progressStripResolved:
    'Technician recorded field completion (awaiting office closure).',
};

const BILLING_WORKFLOW: CategoryTechnicianWorkflow = {
  lane: 'billing',
  progressSectionTitle: 'Billing desk progress',
  progressSectionHint:
    'Track account review, payment reconciliation, and customer contact — not field crew movement.',
  progressOptions: BILLING_PROGRESS,
  startWorkLabel: 'Start billing review',
  resolveSectionTitle: 'Billing resolution',
  resolutionPlaceholder:
    'Outcome for the customer (e.g. payment applied to ledger, credit posted, account corrected, reconnection done). Include statement or transaction reference if used.',
  resolveButtonLabel: 'Complete billing resolution',
  awaitingClosureBlurb:
    'Billing work is marked resolved. A supervisor or billing lead may close the ticket after verifying the ledger and customer notice.',
  progressStripIntro:
    'Billing path: intake → billing assignment → account review & reconciliation → resolved → office closed.',
  progressStripAssigned: 'Assigned to billing staff for account handling.',
  progressStripInProgress: 'Billing review or reconciliation in progress.',
  progressStripResolved:
    'Billing outcome recorded (awaiting supervisor closure).',
};

const METERING_WORKFLOW: CategoryTechnicianWorkflow = {
  lane: 'metering',
  progressSectionTitle: 'Metering progress',
  progressSectionHint:
    'Meter visits, register tests, and hand-off to billing when the register changes.',
  progressOptions: METERING_PROGRESS,
  startWorkLabel: 'Start metering work',
  resolveSectionTitle: 'Metering resolution',
  resolutionPlaceholder:
    'Meter test result, replacement, seal status, and whether billing was notified.',
  resolveButtonLabel: 'Mark metering resolved',
  awaitingClosureBlurb:
    'Metering work is marked resolved. Supervisor or metering lead may close after billing sync if required.',
  progressStripIntro:
    'Metering path: intake → metering assignment → field visit / register work → resolved → closed.',
  progressStripAssigned: 'Assigned to a metering technician.',
  progressStripInProgress: 'Meter visit or register work in progress.',
  progressStripResolved:
    'Metering outcome recorded (awaiting office closure).',
};

const ICT_WORKFLOW: CategoryTechnicianWorkflow = {
  lane: 'ict',
  progressSectionTitle: 'ICT / channel progress',
  progressSectionHint:
    'System, portal, or payment-channel investigation — not pipe or meter field work.',
  progressOptions: ICT_PROGRESS,
  startWorkLabel: 'Start investigation',
  resolveSectionTitle: 'ICT resolution',
  resolutionPlaceholder:
    'Root cause, fix or workaround, and whether the customer can retry payment or portal access.',
  resolveButtonLabel: 'Mark ICT issue resolved',
  awaitingClosureBlurb:
    'ICT resolution is recorded. Supervisor may close after confirming channel health.',
  progressStripIntro:
    'Digital path: intake → ICT assignment → investigation → resolved → closed.',
  progressStripAssigned: 'Assigned to ICT / digital services.',
  progressStripInProgress: 'System or integration investigation in progress.',
  progressStripResolved:
    'ICT fix or workaround recorded (awaiting closure).',
};

const QUALITY_WORKFLOW: CategoryTechnicianWorkflow = {
  lane: 'quality',
  progressSectionTitle: 'Water quality progress',
  progressSectionHint: 'Sampling, lab, advisories, and coordination with operations.',
  progressOptions: QUALITY_PROGRESS,
  startWorkLabel: 'Start quality investigation',
  resolveSectionTitle: 'Quality resolution',
  resolutionPlaceholder:
    'Sampling results, advisory given, and any operations follow-up.',
  resolveButtonLabel: 'Mark quality case resolved',
  awaitingClosureBlurb:
    'Quality investigation is marked resolved. Supervisor may close after advisories are logged.',
  progressStripIntro:
    'Quality path: intake → quality unit → sampling / advisory → resolved → closed.',
  progressStripAssigned: 'Assigned to water quality staff.',
  progressStripInProgress: 'Sampling or investigation in progress.',
  progressStripResolved:
    'Quality outcome recorded (awaiting closure).',
};

const COMPLIANCE_WORKFLOW: CategoryTechnicianWorkflow = {
  lane: 'compliance',
  progressSectionTitle: 'Compliance progress',
  progressSectionHint:
    'Investigation, site inspection, and enforcement — separate from routine billing desk work.',
  progressOptions: COMPLIANCE_PROGRESS,
  startWorkLabel: 'Start compliance review',
  resolveSectionTitle: 'Compliance resolution',
  resolutionPlaceholder:
    'Investigation outcome, notices served, and referrals (billing, maintenance) if any.',
  resolveButtonLabel: 'Mark compliance case resolved',
  awaitingClosureBlurb:
    'Compliance work is marked resolved. Supervisor may close after enforcement steps are complete.',
  progressStripIntro:
    'Compliance path: intake → inspection unit → investigation → resolved → closed.',
  progressStripAssigned: 'Assigned to inspection / compliance staff.',
  progressStripInProgress: 'Investigation or inspection in progress.',
  progressStripResolved:
    'Compliance outcome recorded (awaiting closure).',
};

const BY_CATEGORY: Record<string, CategoryTechnicianWorkflow> = {
  water_supply: FIELD_WORKFLOW,
  infrastructure_maintenance: FIELD_WORKFLOW,
  billing_account: BILLING_WORKFLOW,
  metering: METERING_WORKFLOW,
  water_quality: QUALITY_WORKFLOW,
  digital_payment: ICT_WORKFLOW,
  illegal_connection_fraud: COMPLIANCE_WORKFLOW,
};

export function getCategoryTechnicianWorkflow(
  category: string,
): CategoryTechnicianWorkflow {
  return BY_CATEGORY[category] ?? FIELD_WORKFLOW;
}

export function resolutionHintForIssue(
  category: string,
  subcategory: string | null | undefined,
): string | null {
  if (category !== 'billing_account' || !subcategory) return null;
  const hints: Record<string, string> = {
    payment_not_reflected:
      'Confirm transaction ID and payment channel, match to ledger, post or reverse as needed, then tell the customer the balance and any reconnection step.',
    duplicate_charges:
      'Identify duplicate line items or periods, post credit per policy, and reference the corrected statement.',
    estimated_billing_complaint:
      'Compare read type and period; arrange metering visit if register evidence is required.',
    delayed_reconnection:
      'Verify payment cleared, confirm reconnection order, and note scheduled or completed reconnect.',
  };
  return hints[subcategory] ?? null;
}

export function workProgressLabel(
  category: string,
  value: string | number | undefined,
): string | null {
  if (value == null || value === '') return null;
  const v = String(value);
  const opt = getCategoryTechnicianWorkflow(category).progressOptions.find(
    (o) => o.value === v,
  );
  return opt?.label ?? v.replace(/_/g, ' ');
}
