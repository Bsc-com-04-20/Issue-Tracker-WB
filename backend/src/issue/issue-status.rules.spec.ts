import { IssueStatus } from '../common/enums/issue-status.enum';
import {
  canCloseIssueFromStatus,
  isValidTechnicianStatusTransition,
} from './issue-status.rules';

describe('issue-status.rules (unit — workflow validation)', () => {
  describe('isValidTechnicianStatusTransition', () => {
    it('allows assigned → in_progress', () => {
      expect(
        isValidTechnicianStatusTransition(
          IssueStatus.ASSIGNED,
          IssueStatus.IN_PROGRESS,
        ),
      ).toBe(true);
    });

    it('allows in_progress → resolved', () => {
      expect(
        isValidTechnicianStatusTransition(
          IssueStatus.IN_PROGRESS,
          IssueStatus.RESOLVED,
        ),
      ).toBe(true);
    });

    it('rejects reported → resolved (documented invalid case)', () => {
      expect(
        isValidTechnicianStatusTransition(
          IssueStatus.REPORTED,
          IssueStatus.RESOLVED,
        ),
      ).toBe(false);
    });

    it('rejects assigned → resolved (must go through in_progress)', () => {
      expect(
        isValidTechnicianStatusTransition(
          IssueStatus.ASSIGNED,
          IssueStatus.RESOLVED,
        ),
      ).toBe(false);
    });
  });

  describe('canCloseIssueFromStatus', () => {
    it('allows close only from resolved', () => {
      expect(canCloseIssueFromStatus(IssueStatus.RESOLVED)).toBe(true);
      expect(canCloseIssueFromStatus(IssueStatus.IN_PROGRESS)).toBe(false);
      expect(canCloseIssueFromStatus(IssueStatus.CLOSED)).toBe(false);
    });
  });
});
