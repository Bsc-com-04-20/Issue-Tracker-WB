import { IssueStatus } from '../../common/enums/issue-status.enum';
export declare class UpdateIssueStatusDto {
    status: IssueStatus.IN_PROGRESS | IssueStatus.RESOLVED;
    resolutionDetails?: string;
}
