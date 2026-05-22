import { Repository } from 'typeorm';
import { Issue } from '../issue/issue.entity';
import { Resolution } from '../issue/resolution.entity';
import { ReportDateRangeQueryDto, ResolutionReportDateRangeQueryDto } from './dto/report-date-range.query.dto';
export type ReportPeriodMeta = {
    from: string | null;
    to: string | null;
    appliesTo: 'issue.dateReported' | 'resolution.dateResolved';
};
export declare class ReportService {
    private readonly issueRepository;
    private readonly resolutionRepository;
    constructor(issueRepository: Repository<Issue>, resolutionRepository: Repository<Resolution>);
    getSummary(issueRange: ReportDateRangeQueryDto): Promise<{
        period: ReportPeriodMeta;
        totals: {
            issues: number;
        };
        byStatus: Record<string, number>;
        bySeverity: Record<string, number>;
        byReportChannel: Record<string, number>;
        byServiceArea: Record<string, number>;
    }>;
    getResolutionStats(range: ResolutionReportDateRangeQueryDto): Promise<{
        period: ReportPeriodMeta;
        resolvedCount: number;
        avgHoursReportedToResolved: number | null;
    }>;
    getIssuesByMonth(issueRange: ReportDateRangeQueryDto): Promise<{
        period: ReportPeriodMeta;
        issuesByMonth: {
            month: string;
            count: number;
        }[];
    }>;
    private applyIssueReportedBetween;
    private applyResolutionResolvedBetween;
    private toCountMap;
}
