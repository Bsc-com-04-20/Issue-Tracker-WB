import { IssueStatus } from '../common/enums/issue-status.enum';
export declare function isValidTechnicianStatusTransition(from: IssueStatus, to: IssueStatus): boolean;
export declare function canCloseIssueFromStatus(current: IssueStatus): boolean;
