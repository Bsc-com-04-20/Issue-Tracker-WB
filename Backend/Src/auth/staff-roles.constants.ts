import { Role } from '../common/enums/role.enum';

/** Staff who may perform intake-style issue API actions (list, merge, duplicates, create). */
export const ISSUE_STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.INTAKE_OFFICER,
  Role.DEPARTMENT_OFFICER,
];
