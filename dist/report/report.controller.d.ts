import { ReportService } from './report.service';
import { ReportDateRangeQueryDto, ResolutionReportDateRangeQueryDto } from './dto/report-date-range.query.dto';
export declare class ReportController {
    private readonly reportService;
    constructor(reportService: ReportService);
    getSummary(query: ReportDateRangeQueryDto): Promise<{
        period: import("./report.service").ReportPeriodMeta;
        totals: {
            issues: number;
        };
        byStatus: Record<string, number>;
        bySeverity: Record<string, number>;
        byReportChannel: Record<string, number>;
        byServiceArea: Record<string, number>;
    }>;
    getResolutionStats(query: ResolutionReportDateRangeQueryDto): Promise<{
        period: import("./report.service").ReportPeriodMeta;
        resolvedCount: number;
        avgHoursReportedToResolved: number | null;
    }>;
    getIssuesByMonth(query: ReportDateRangeQueryDto): Promise<{
        period: import("./report.service").ReportPeriodMeta;
        issuesByMonth: {
            month: string;
            count: number;
        }[];
    }>;
}
