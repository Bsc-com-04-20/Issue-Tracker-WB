/**
 * Operational conversation engine — rules-driven utility intake assistant.
 * Encodes escalation, redirects, confidentiality, and workflow reasoning used by the public/staff chat UI.
 */

export type ConversationPhase =
  | 'identity'
  | 'issue_triage'
  | 'location'
  | 'contact'
  | 'complete';

export type EscalationTier =
  | 'routine'
  | 'elevated'
  | 'urgent'
  | 'emergency'
  | 'critical_health';

export type OperationalAlertTone = 'info' | 'caution' | 'urgent' | 'confidential';

export type OperationalAlert = {
  id: string;
  tone: OperationalAlertTone;
  title: string;
  body: string;
};

export type CategoryRedirect = {
  fromCategory: string;
  fromSubcategory?: string;
  toCategory: string;
  toSubcategory: string;
  reason: string;
  trigger: 'rule' | 'description';
};

export type OperationalContext = {
  mode: 'public' | 'staff';
  phase: ConversationPhase;
  currentStepId?: string;
  issueCategory: string;
  issueSubcategory: string;
  description: string;
  issueAttributes: Record<string, string>;
  severityLevel: string;
  urgencyLevel: string;
  affectedScope: string;
  meterVerified: boolean;
  intakeRoutingHint?: string | null;
};

export type OperationalBriefing = {
  phase: ConversationPhase;
  phaseLabel: string;
  escalationTier: EscalationTier;
  escalationLabel: string;
  operationalSummary: string;
  alerts: OperationalAlert[];
  redirects: CategoryRedirect[];
  workflowActions: string[];
  aiAssistNote: string | null;
  confidentialityMode: boolean;
  dispatchLane: string;
};

const EMERGENCY_SUBCATEGORIES = new Set([
  'pipe_burst',
  'suspected_contamination',
  'water_theft',
  'illegal_water_connection',
  'tampering_with_infrastructure',
]);

const INFRASTRUCTURE_EMERGENCY = new Set([
  'pipe_burst',
  'broken_hydrant',
  'reservoir_or_tank_damage',
  'water_leakage',
]);

const PAYMENT_RECONCILIATION_SUBCATEGORIES = new Set([
  'payment_not_reflected',
  'duplicate_charges',
  'failed_online_payment',
  'mobile_money_sync_failure',
]);

const CONTAMINATION_SUBCATEGORIES = new Set([
  'suspected_contamination',
  'brown_or_dirty_water',
  'bad_smell',
  'bad_taste',
  'silt_or_mud_presence',
]);

const FRAUD_CATEGORY = 'illegal_connection_fraud';

const CATEGORY_LABELS: Record<string, string> = {
  water_supply: 'Water Supply',
  infrastructure_maintenance: 'Infrastructure & Maintenance',
  billing_account: 'Billing & Account',
  metering: 'Metering',
  water_quality: 'Water Quality',
  digital_payment: 'Digital & Payment',
  illegal_connection_fraud: 'Illegal Connections & Fraud',
};

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

export function inferConversationPhase(
  stepId: string | undefined,
  botStepIndex: number,
  totalSteps: number,
): ConversationPhase {
  if (botStepIndex >= totalSteps) return 'complete';
  if (!stepId) return 'identity';
  if (
    stepId.startsWith('registry') ||
    stepId === 'publicWelcome'
  ) {
    return 'identity';
  }
  if (
    stepId === 'issueCategory' ||
    stepId === 'issueSubcategory' ||
    stepId.startsWith('attr:') ||
    stepId === 'description'
  ) {
    return 'issue_triage';
  }
  if (
    stepId === 'publicDistrict' ||
    stepId === 'publicLocation' ||
    stepId === 'locationNarrative' ||
    stepId === 'addressDescription' ||
    stepId === 'latitude' ||
    stepId === 'longitude'
  ) {
    return 'location';
  }
  if (stepId === 'reporterName' || stepId === 'reporterEmail') {
    return 'contact';
  }
  if (stepId === 'meterNumber' || stepId === 'reportChannel') {
    return 'issue_triage';
  }
  return botStepIndex < totalSteps * 0.35 ? 'identity' : 'issue_triage';
}

function resolveEscalationTier(ctx: OperationalContext): EscalationTier {
  const sub = ctx.issueSubcategory;
  if (sub === 'suspected_contamination') return 'critical_health';
  if (EMERGENCY_SUBCATEGORIES.has(sub)) return 'emergency';
  if (ctx.urgencyLevel === 'critical' || ctx.severityLevel === 'high') {
    if (ctx.issueCategory === 'water_quality') return 'critical_health';
    return 'emergency';
  }
  if (ctx.urgencyLevel === 'urgent' || INFRASTRUCTURE_EMERGENCY.has(sub)) {
    return 'urgent';
  }
  if (
    ctx.affectedScope === 'community' ||
    ctx.issueCategory === 'water_quality' ||
    ctx.issueCategory === 'infrastructure_maintenance'
  ) {
    return 'elevated';
  }
  return 'routine';
}

function escalationLabel(tier: EscalationTier): string {
  switch (tier) {
    case 'critical_health':
      return 'Critical — public health';
    case 'emergency':
      return 'Emergency dispatch';
    case 'urgent':
      return 'Urgent operations';
    case 'elevated':
      return 'Elevated priority';
    default:
      return 'Standard queue';
  }
}

function phaseLabel(phase: ConversationPhase): string {
  switch (phase) {
    case 'identity':
      return 'Account verification';
    case 'issue_triage':
      return 'Operational triage';
    case 'location':
      return 'Field location';
    case 'contact':
      return 'Contact confirmation';
    case 'complete':
      return 'Ready to submit';
  }
}

function dispatchLane(ctx: OperationalContext): string {
  const cat = ctx.issueCategory;
  if (cat === 'illegal_connection_fraud') {
    return 'Inspection & Compliance (restricted access)';
  }
  if (cat === 'water_quality' || CONTAMINATION_SUBCATEGORIES.has(ctx.issueSubcategory)) {
    return 'Water Quality + Laboratory workflow';
  }
  if (cat === 'infrastructure_maintenance' || INFRASTRUCTURE_EMERGENCY.has(ctx.issueSubcategory)) {
    return 'Network Maintenance — field dispatch';
  }
  if (cat === 'billing_account' || PAYMENT_RECONCILIATION_SUBCATEGORIES.has(ctx.issueSubcategory)) {
    return 'Billing operations (+ ICT if integration fault)';
  }
  if (cat === 'digital_payment') {
    return 'ICT / Payment platform reconciliation';
  }
  if (cat === 'metering') {
    return 'Metering operations';
  }
  return 'Water supply & distribution operations';
}

export function detectCategoryRedirects(ctx: OperationalContext): CategoryRedirect[] {
  const redirects: CategoryRedirect[] = [];
  const desc = normalizeText(ctx.description);
  const { issueCategory: cat, issueSubcategory: sub } = ctx;

  if (
    cat === 'metering' &&
    sub === 'prepaid_meter_token_failure' &&
    /\b(everyone|all customers|whole area|system down|platform)\b/.test(desc)
  ) {
    redirects.push({
      fromCategory: cat,
      fromSubcategory: sub,
      toCategory: 'digital_payment',
      toSubcategory: 'token_generation_failure',
      reason:
        'Wide-area token failures usually indicate a central platform outage, not a single meter.',
      trigger: 'description',
    });
  }

  if (
    cat === 'digital_payment' &&
    sub === 'token_generation_failure' &&
    /\b(only my meter|one meter|single household|just us)\b/.test(desc)
  ) {
    redirects.push({
      fromCategory: cat,
      fromSubcategory: sub,
      toCategory: 'metering',
      toSubcategory: 'prepaid_meter_token_failure',
      reason: 'Single-premise token load failures are typically meter or CIU issues.',
      trigger: 'description',
    });
  }

  if (
    cat === 'water_supply' &&
    (sub === 'no_water_supply' || sub === 'low_water_pressure') &&
    /\b(burst|broken pipe|hydrant|major leak|water flooding street)\b/.test(desc)
  ) {
    redirects.push({
      fromCategory: cat,
      fromSubcategory: sub,
      toCategory: 'infrastructure_maintenance',
      toSubcategory: 'pipe_burst',
      reason: 'Visible asset damage on the network should be logged under infrastructure.',
      trigger: 'description',
    });
  }

  if (
    cat === 'infrastructure_maintenance' &&
    sub === 'pipe_burst' &&
    /\b(no water|no supply|dry tap|nothing coming out)\b/.test(desc) &&
    !/\b(burst|break|leak|flood|hydrant)\b/.test(desc)
  ) {
    redirects.push({
      fromCategory: cat,
      fromSubcategory: sub,
      toCategory: 'water_supply',
      toSubcategory: 'no_water_supply',
      reason: 'Loss of supply without confirmed asset damage is triaged as supply operations first.',
      trigger: 'description',
    });
  }

  if (
    cat === 'billing_account' &&
    sub === 'payment_not_reflected' &&
    /\b(app|portal|website|login|sync|api|system error)\b/.test(desc)
  ) {
    redirects.push({
      fromCategory: cat,
      fromSubcategory: sub,
      toCategory: 'digital_payment',
      toSubcategory: 'failed_online_payment',
      reason: 'Channel or platform errors before ledger posting are escalated to digital payment teams.',
      trigger: 'description',
    });
  }

  return redirects;
}

function buildWorkflowActions(ctx: OperationalContext): string[] {
  const actions: string[] = [];
  const sub = ctx.issueSubcategory;

  if (PAYMENT_RECONCILIATION_SUBCATEGORIES.has(sub)) {
    actions.push('Capture bank / mobile-money reference, date, amount, and channel for ledger reconciliation.');
    if (!ctx.issueAttributes.transactionId?.trim()) {
      actions.push('Transaction ID not yet captured — add it in the structured fields for faster matching.');
    }
  }

  if (CONTAMINATION_SUBCATEGORIES.has(sub)) {
    actions.push('Do not drink or cook with the water until an official all-clear is issued.');
    if (sub === 'suspected_contamination') {
      actions.push('Laboratory chain-of-custody and precautionary sampling will be initiated.');
    } else {
      actions.push('Operations may schedule flushing or sampling depending on symptoms.');
    }
  }

  if (INFRASTRUCTURE_EMERGENCY.has(sub)) {
    actions.push('Keep people clear of flowing water, excavations, and damaged hydrants or valves.');
    actions.push('Dispatch coordinates with zone isolation and traffic control where required.');
  }

  if (ctx.issueCategory === FRAUD_CATEGORY) {
    actions.push('Report routes to inspection with restricted visibility — avoid sharing suspect identity publicly.');
  }

  if (ctx.issueCategory === 'water_supply') {
    const neighbours = normalizeText(ctx.issueAttributes.neighboursSameIssue ?? '');
    if (neighbours.includes('yes')) {
      actions.push('Neighbouring premises reporting the same issue — treat as possible zone-level outage.');
    }
  }

  return actions;
}

function buildAlerts(
  ctx: OperationalContext,
  tier: EscalationTier,
  redirects: CategoryRedirect[],
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  if (ctx.issueCategory === FRAUD_CATEGORY) {
    alerts.push({
      id: 'fraud-confidential',
      tone: 'confidential',
      title: 'Confidential fraud intake',
      body:
        'This report is handled under restricted access. Provide factual observations only; personal details of suspects are optional and protected.',
    });
  }

  if (tier === 'critical_health') {
    alerts.push({
      id: 'health-critical',
      tone: 'urgent',
      title: 'Public health escalation',
      body:
        'Treated as highest priority. If you have been advised to boil water or stop use, follow that guidance until the utility issues an all-clear.',
    });
  } else if (tier === 'emergency') {
    alerts.push({
      id: 'emergency-dispatch',
      tone: 'urgent',
      title: 'Emergency operations',
      body:
        'Immediate dispatch lane engaged. Crews aim for same-day response on working days when resources allow.',
    });
  }

  for (const r of redirects) {
    alerts.push({
      id: `redirect-${r.toCategory}-${r.toSubcategory}`,
      tone: 'caution',
      title: 'Suggested category adjustment',
      body: `${r.reason} Consider ${CATEGORY_LABELS[r.toCategory] ?? r.toCategory} → ${r.toSubcategory.replace(/_/g, ' ')}.`,
    });
  }

  if (ctx.intakeRoutingHint) {
    alerts.push({
      id: 'routing-hint',
      tone: 'info',
      title: 'Operational routing logic',
      body: ctx.intakeRoutingHint,
    });
  }

  if (ctx.phase === 'identity' && ctx.mode === 'public' && !ctx.meterVerified) {
    alerts.push({
      id: 'identity-pending',
      tone: 'info',
      title: 'Account linkage',
      body:
        'Meter verification ties this report to the registered account holder, supply zone, and billing context.',
    });
  }

  return alerts;
}

export function evaluateOperationalBriefing(ctx: OperationalContext): OperationalBriefing {
  const tier = resolveEscalationTier(ctx);
  const redirects = detectCategoryRedirects(ctx);
  const confidentialityMode = ctx.issueCategory === FRAUD_CATEGORY;
  const workflowActions = buildWorkflowActions(ctx);
  const alerts = buildAlerts(ctx, tier, redirects);

  let operationalSummary = `${phaseLabel(ctx.phase)} · ${dispatchLane(ctx)} · ${escalationLabel(tier)}.`;
  if (tier === 'routine') {
    operationalSummary +=
      ' Standard SLA applies; structured answers improve first-time routing accuracy.';
  }

  const aiAssistNote =
    ctx.phase === 'issue_triage' && ctx.description.trim().length > 40
      ? 'AI-assisted classification (future): narrative will suggest category refinements and missing reconciliation fields.'
      : null;

  return {
    phase: ctx.phase,
    phaseLabel: phaseLabel(ctx.phase),
    escalationTier: tier,
    escalationLabel: escalationLabel(tier),
    operationalSummary,
    alerts,
    redirects,
    workflowActions,
    aiAssistNote,
    confidentialityMode,
    dispatchLane: dispatchLane(ctx),
  };
}

export type StepOperationalOverlay = {
  promptPrefix?: string;
  helperSuffix?: string;
};

export function getStepOperationalOverlay(
  stepId: string,
  ctx: OperationalContext,
  briefing: OperationalBriefing,
): StepOperationalOverlay {
  const overlay: StepOperationalOverlay = {};

  if (stepId === 'issueCategory') {
    overlay.promptPrefix =
      'Operations triage — which complaint domain should own this case?';
    if (briefing.escalationTier !== 'routine') {
      overlay.helperSuffix = `Current signals suggest ${briefing.escalationLabel.toLowerCase()} once details are confirmed.`;
    }
  }

  if (stepId === 'issueSubcategory') {
    overlay.promptPrefix = 'Narrow the operational subtype for routing and SLA policy.';
  }

  if (stepId === 'description') {
    if (ctx.issueCategory === FRAUD_CATEGORY) {
      overlay.helperSuffix =
        'Describe what you observed (location, time, nature of connection). Avoid naming suspects unless you choose to — reports are confidential.';
    } else if (PAYMENT_RECONCILIATION_SUBCATEGORIES.has(ctx.issueSubcategory)) {
      overlay.helperSuffix =
        'Include payment date, amount, channel (bank / mobile money), and any reference number for reconciliation.';
    } else if (CONTAMINATION_SUBCATEGORIES.has(ctx.issueSubcategory)) {
      overlay.helperSuffix =
        'Note when symptoms started, whether neighbours are affected, and any official boil-water advice already received.';
    } else if (INFRASTRUCTURE_EMERGENCY.has(ctx.issueSubcategory)) {
      overlay.helperSuffix =
        'Describe visible damage, water flow rate, and safety risks (traffic, buildings, schools nearby).';
    }
  }

  if (stepId.startsWith('attr:') && PAYMENT_RECONCILIATION_SUBCATEGORIES.has(ctx.issueSubcategory)) {
    overlay.helperSuffix = 'Used by billing and ICT to match ledger and channel posts.';
  }

  if (stepId === 'locationNarrative' && briefing.escalationTier !== 'routine') {
    overlay.helperSuffix = 'Precise landmarks accelerate emergency and quality field response.';
  }

  return overlay;
}

export function isEmergencySubcategory(subcategory: string): boolean {
  return EMERGENCY_SUBCATEGORIES.has(subcategory);
}
