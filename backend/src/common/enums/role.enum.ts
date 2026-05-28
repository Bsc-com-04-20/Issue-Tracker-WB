/**
 * Water board issue tracking — streamlined role model (2026).
 * Department queue is driven by `User.department` (classification keys) for `department_officer`.
 */
export enum Role {
  /** Full configuration, users, and system access */
  ADMIN = 'admin',
  /** Dispatch, closure, SLA oversight, reports */
  SUPERVISOR = 'supervisor',
  /** Field work and status transitions */
  TECHNICIAN = 'technician',
  /** Intake, triage, duplicate handling, logging issues on behalf of customers */
  INTAKE_OFFICER = 'intake_officer',
  /** Unit/department queue; requires `department` set to routing key (e.g. billing_department) */
  DEPARTMENT_OFFICER = 'department_officer',
  /** Logged-in citizen / community portal (limited app surface) */
  CITIZEN = 'citizen',
}
