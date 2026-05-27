import type { IssueDetail } from '@/lib/types';
import { intakeDuplicateCandidateCount } from '@/lib/issueIntelligence';
import { issueHasSupervisorRequest } from '@/lib/auth';

export type MentorStepId =
  | 'understand'
  | 'duplicates'
  | 'verify'
  | 'dispatch'
  | 'escalate';

export type MentorStepState = 'done' | 'current' | 'pending' | 'optional';

export type MentorStep = {
  id: MentorStepId;
  title: string;
  hint: string;
  state: MentorStepState;
  /** Show this step expanded by default */
  defaultOpen: boolean;
};

function hasPhoneAndMap(issue: IssueDetail): boolean {
  return (
    Boolean(issue.reporterPhone?.trim()) &&
    issue.location != null &&
    issue.location.latitude != null &&
    issue.location.longitude != null
  );
}

export function buildIntakeMentorSteps(
  issue: IssueDetail,
  status: string,
): MentorStep[] {
  const dupCount = intakeDuplicateCandidateCount(issue.issueAttributes);
  const hasAssignment = Boolean(issue.currentAssignment);
  const verified = hasPhoneAndMap(issue);
  const supervisorFlagged = issueHasSupervisorRequest(issue.issueAttributes);
  const closed = status === 'closed' || status === 'resolved';

  const understandDone = true;
  const dupDone = dupCount === 0 || status !== 'reported';
  const verifyDone = verified;
  const dispatchDone =
    status === 'assigned' ||
    status === 'in_progress' ||
    status === 'resolved' ||
    status === 'closed' ||
    hasAssignment;

  const steps: Omit<MentorStep, 'state' | 'defaultOpen'>[] = [
    {
      id: 'understand',
      title: 'Read the complaint',
      hint: 'Confirm what the customer reported and where it is.',
    },
    {
      id: 'duplicates',
      title: dupCount > 0 ? `Check duplicates (${dupCount})` : 'Check duplicates',
      hint:
        dupCount > 0
          ? 'The system found other open tickets that may be the same incident.'
          : 'No strong duplicate matches right now — still skim if the caller sounds familiar.',
    },
    {
      id: 'verify',
      title: 'Verify phone & location',
      hint: verified
        ? 'Contact details look complete.'
        : 'Add or correct the phone number and map pin before dispatch.',
    },
    {
      id: 'dispatch',
      title: hasAssignment ? 'Technician assigned' : 'Send to the field',
      hint: hasAssignment
        ? `${issue.currentAssignment?.technicianName ?? 'Technician'} is on this ticket.`
        : 'Choose a technician when you are ready to start field work.',
    },
    {
      id: 'escalate',
      title: 'Need a supervisor?',
      hint: supervisorFlagged
        ? 'Already flagged — waiting for supervisor review.'
        : 'Only if policy, safety, or routing needs a decision above intake.',
    },
  ];

  if (closed) {
    return steps.map((s, i) => ({
      ...s,
      state: 'done' as const,
      defaultOpen: i === 0,
    }));
  }

  const states: MentorStepState[] = [
    understandDone ? 'done' : 'current',
    dupDone ? 'done' : understandDone ? 'current' : 'pending',
    verifyDone ? 'done' : dupDone && understandDone ? 'current' : 'pending',
    dispatchDone ? 'done' : verifyDone ? 'current' : 'pending',
    'optional',
  ];

  let currentSet = false;
  const withStates = steps.map((s, i) => {
    let state = states[i];
    if (state === 'current') currentSet = true;
    if (!currentSet && i > 0 && states[i - 1] === 'done' && state === 'pending') {
      state = 'current';
      currentSet = true;
    }
    return {
      ...s,
      state,
      defaultOpen:
        state === 'current' ||
        (s.id === 'duplicates' && dupCount > 0 && status === 'reported'),
    };
  });

  if (!currentSet && status === 'reported') {
    const verifyIdx = withStates.findIndex((s) => s.id === 'verify');
    if (verifyIdx >= 0 && withStates[verifyIdx].state === 'pending') {
      withStates[verifyIdx] = { ...withStates[verifyIdx], state: 'current', defaultOpen: true };
    }
  }

  return withStates;
}

export function statusLabelPlain(status: string): string {
  const map: Record<string, string> = {
    reported: 'Waiting for intake',
    assigned: 'With technician',
    in_progress: 'Work in progress',
    resolved: 'Resolved — pending closure',
    closed: 'Closed',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

export function categoryLabelPlain(cat: string): string {
  return cat.replace(/_/g, ' ');
}
