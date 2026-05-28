import { IssueStatus } from '../common/enums/issue-status.enum';

/** Technician PATCH /issue/:id/status — no skipping stages (doc: invalid reported→resolved). */
export function isValidTechnicianStatusTransition(
  from: IssueStatus,
  to: IssueStatus,
): boolean {
  return (
    (from === IssueStatus.ASSIGNED && to === IssueStatus.IN_PROGRESS) ||
    (from === IssueStatus.IN_PROGRESS && to === IssueStatus.RESOLVED)
  );
}

/** Supervisor/admin POST /issue/:id/close */
export function canCloseIssueFromStatus(current: IssueStatus): boolean {
  return current === IssueStatus.RESOLVED;
}
