export type JwtPayload = {
  sub: number;
  email: string;
  role: string;
  exp: number;
  /** Unit routing key for `department_officer` (e.g. billing_department) */
  department?: string | null;
};

const ADMIN_ROLES = new Set(['admin']);
const SUPERVISOR_ROLES = new Set(['supervisor']);

function normalizeRole(role: string): string {
  return role?.toLowerCase?.() ?? '';
}

export function isDepartmentOfficerRole(role: string): boolean {
  return normalizeRole(role) === 'department_officer';
}

/** Back-compat alias after role consolidation */
export const isDepartmentSpecialistRole = isDepartmentOfficerRole;

export function isIntakeOfficerRole(role: string): boolean {
  return normalizeRole(role) === 'intake_officer';
}

/** @deprecated use isIntakeOfficerRole */
export function isCustomerOperationsRole(role: string): boolean {
  return isIntakeOfficerRole(role);
}

const STAFF_ISSUE_ROLES = new Set([
  'intake_officer',
  'department_officer',
]);

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function canAccessReports(role: string): boolean {
  const r = normalizeRole(role);
  return ADMIN_ROLES.has(r) || SUPERVISOR_ROLES.has(r);
}

/** Operational pulse (SLA load, resolved today); intake may read this without full reports. */
export function canAccessOperationalPulse(role: string): boolean {
  const r = normalizeRole(role);
  return (
    ADMIN_ROLES.has(r) ||
    SUPERVISOR_ROLES.has(r) ||
    isIntakeOfficerRole(role)
  );
}

/** Admin and supervisor may filter the staff issue list by routed department. */
export function canFilterIssuesByDepartment(role: string): boolean {
  const r = normalizeRole(role);
  return ADMIN_ROLES.has(r) || SUPERVISOR_ROLES.has(r);
}

/** Run SLA breach batch job (API: POST /issue/admin/process-sla-breaches). */
export function canRunSlaBreachScan(role: string): boolean {
  return canFilterIssuesByDepartment(role);
}

/** Read merged SLA policy JSON (GET /issue/admin/sla-policy). */
export function canViewSlaPolicy(role: string): boolean {
  return canFilterIssuesByDepartment(role);
}

/** Merge reported duplicate into another primary (same as API staff merge). */
export function canMergeDuplicatesOnIssue(role: string): boolean {
  const r = normalizeRole(role);
  return (
    ADMIN_ROLES.has(r) ||
    SUPERVISOR_ROLES.has(r) ||
    isIntakeOfficerRole(role) ||
    isDepartmentOfficerRole(role)
  );
}

/** Clear intake escalation flag after handling (POST acknowledge). */
export function canAcknowledgeSupervisorEscalation(role: string): boolean {
  return canFilterIssuesByDepartment(role);
}

export function canListAllIssues(role: string): boolean {
  const r = normalizeRole(role);
  return (
    ADMIN_ROLES.has(r) ||
    SUPERVISOR_ROLES.has(r) ||
    STAFF_ISSUE_ROLES.has(r)
  );
}

/** Bulk CSV of issue list — not offered to intake (full-network export). */
export function canExportStaffIssuesCsv(role: string): boolean {
  if (isIntakeOfficerRole(role)) return false;
  return canListAllIssues(role);
}

export function canCreateIssue(role: string): boolean {
  return canListAllIssues(role);
}

export function canNavigateIssues(role: string): boolean {
  return normalizeRole(role) === 'technician' || canListAllIssues(role);
}

export function canCloseIssue(role: string): boolean {
  const r = normalizeRole(role);
  return (
    ADMIN_ROLES.has(r) ||
    SUPERVISOR_ROLES.has(r) ||
    isDepartmentOfficerRole(role)
  );
}

export function isTechnician(role: string): boolean {
  return normalizeRole(role) === 'technician';
}

/** Assign / reassign; intake may dispatch from reported; department officers scoped to their unit on the server */
export function canAssignIssue(role: string): boolean {
  const r = normalizeRole(role);
  return (
    ADMIN_ROLES.has(r) ||
    SUPERVISOR_ROLES.has(r) ||
    isIntakeOfficerRole(role) ||
    isDepartmentOfficerRole(role)
  );
}

export function canManageUsers(role: string): boolean {
  return ADMIN_ROLES.has(normalizeRole(role));
}

/** Audit log; department officers get unit-scoped Issue rows from API */
export function canViewAudit(role: string): boolean {
  const r = normalizeRole(role);
  return (
    ADMIN_ROLES.has(r) ||
    SUPERVISOR_ROLES.has(r) ||
    isDepartmentOfficerRole(role)
  );
}

/** Set via POST /issue/:id/request-supervisor (issueAttributes). */
export function issueHasSupervisorRequest(
  attrs: Record<string, string | number | boolean> | null | undefined,
): boolean {
  if (!attrs) return false;
  const v = attrs.cs_supervisor_requested;
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** Supervisor/admin marked the intake escalation as handled. */
export function issueSupervisorEscalationAcknowledged(
  attrs: Record<string, string | number | boolean> | null | undefined,
): boolean {
  if (!attrs) return false;
  const v = attrs.cs_supervisor_acknowledged;
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** Re-run duplicate scoring / co-unit hints; correct reporter phone or map pin (intake, supervisor, admin). */
export function canRefreshIntelligenceAndReporterContact(role: string): boolean {
  const r = normalizeRole(role);
  return (
    ADMIN_ROLES.has(r) ||
    SUPERVISOR_ROLES.has(r) ||
    isIntakeOfficerRole(role)
  );
}

/** CS / intake actions: front-line roles only (merge duplicate, request supervisor). Admins and supervisors use dispatch and reports instead. */
export function canUseIntakeIssueTools(role: string): boolean {
  return isIntakeOfficerRole(role) || isDepartmentOfficerRole(role);
}

export function canRequestSupervisorOnIssue(role: string): boolean {
  return canUseIntakeIssueTools(role);
}

export function isSupervisorOrManagerRole(role: string): boolean {
  return SUPERVISOR_ROLES.has(normalizeRole(role));
}

/** Short copy for supervisor workspace headers (dispatch, closure, oversight — not intake or user admin). */
export function supervisorRoleSummary(): string {
  return (
    'Supervisors oversee the full backlog: assign or reassign technicians, review and acknowledge intake escalations, merge duplicate registrations when needed, ' +
    'monitor SLA and patterns in reports, verify resolved work before closure, and use the audit trail. ' +
    'Intake officers handle new complaints, duplicate checks, and “request supervisor” from the field; ' +
    'administrators manage users and system configuration.'
  );
}

/** Default queue filter when JWT has no department (set User.department in admin UI) */
export function defaultDepartmentKeyForSpecialistRole(
  _role: string,
): string | null {
  return null;
}

/** Collapsed by default for admin/supervisor to reduce noise on the issue page. */
export function expandDepartmentPlaybookByDefault(role: string): boolean {
  return isDepartmentOfficerRole(role) || isIntakeOfficerRole(role);
}

export function dashboardRouteForRole(role: string): string {
  const r = normalizeRole(role);
  if (ADMIN_ROLES.has(r)) return '/app/reports';
  if (r === 'technician') return '/app/dashboard/technician';
  if (isSupervisorOrManagerRole(r)) return '/app/dashboard/supervisor';
  if (isIntakeOfficerRole(r)) return '/app/dashboard/operations';
  if (isDepartmentOfficerRole(r)) return '/app/dashboard/department';
  return '/app/dashboard/general';
}
