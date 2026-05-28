export type PublicAssignmentSummaryDto = {
  assigned: boolean;
  assigneeName: string;
  assigneePhone: string | null;
  estimatedResponseHours: number;
  departmentLabel: string;
  currentStatus: string;
};

export type PublicIssueCreateResultDto = {
  id: number;
  reference: string;
  publicReference: string | null;
  issueCategory: string;
  issueSubcategory: string | null;
  currentStatus: string;
  assignment: PublicAssignmentSummaryDto | null;
};
