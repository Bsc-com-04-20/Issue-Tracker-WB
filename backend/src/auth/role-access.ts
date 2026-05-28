import { Role } from '../common/enums/role.enum';

const ADMIN_COMPAT: Role[] = [Role.ADMIN];
const SUPERVISOR_COMPAT: Role[] = [Role.SUPERVISOR];

const STAFF_ISSUE_ACCESS: Role[] = [
  Role.INTAKE_OFFICER,
  Role.DEPARTMENT_OFFICER,
];

export function roleSatisfies(required: Role, actual: Role): boolean {
  if (required === actual) return true;
  if (required === Role.ADMIN) return ADMIN_COMPAT.includes(actual);
  if (required === Role.SUPERVISOR) return SUPERVISOR_COMPAT.includes(actual);
  if (required === Role.INTAKE_OFFICER) {
    return (
      actual === Role.INTAKE_OFFICER ||
      ADMIN_COMPAT.includes(actual) ||
      SUPERVISOR_COMPAT.includes(actual)
    );
  }
  if (required === Role.DEPARTMENT_OFFICER) {
    return actual === Role.DEPARTMENT_OFFICER;
  }
  return false;
}

/** Full issue read / attachment access for any back-office staff role. */
export function canViewAnyIssueAsStaff(role: Role): boolean {
  return (
    ADMIN_COMPAT.includes(role) ||
    SUPERVISOR_COMPAT.includes(role) ||
    STAFF_ISSUE_ACCESS.includes(role)
  );
}

/**
 * When non-null, staff may only list/view issues with assignedDepartment in this list.
 * Intake/supervisors/admins get null (all issues); department officers get their unit key.
 */
export function canStaffQueryAssignedDepartmentFilter(role: Role): boolean {
  return ADMIN_COMPAT.includes(role) || SUPERVISOR_COMPAT.includes(role);
}

export function isDepartmentOfficerRole(role: Role): boolean {
  return role === Role.DEPARTMENT_OFFICER;
}

export function staffAssignedDepartmentListScope(
  role: Role,
  department: string | null | undefined,
): string[] | null {
  if (ADMIN_COMPAT.includes(role) || SUPERVISOR_COMPAT.includes(role)) {
    return null;
  }
  if (role === Role.DEPARTMENT_OFFICER) {
    const d = department?.trim();
    if (!d) {
      return [];
    }
    return [d];
  }
  if (STAFF_ISSUE_ACCESS.includes(role)) {
    return null;
  }
  return null;
}
