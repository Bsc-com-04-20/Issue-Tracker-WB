import { Role } from '../common/enums/role.enum';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

export const FRAUD_INVESTIGATION_CATEGORY = 'illegal_connection_fraud';

/** Sensitive investigation queue: not visible to intake or non-inspection department officers. */
export function canAccessFraudInvestigationIssueAsStaff(viewer: JwtUser): boolean {
  if (viewer.role === Role.ADMIN || viewer.role === Role.SUPERVISOR) {
    return true;
  }
  if (
    viewer.role === Role.DEPARTMENT_OFFICER &&
    (viewer.department ?? '').trim() === 'inspection_compliance_unit'
  ) {
    return true;
  }
  return false;
}
