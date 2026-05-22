"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const issue_entity_1 = require("../issue/issue.entity");
const resolution_entity_1 = require("../issue/resolution.entity");
let ReportService = class ReportService {
    issueRepository;
    resolutionRepository;
    constructor(issueRepository, resolutionRepository) {
        this.issueRepository = issueRepository;
        this.resolutionRepository = resolutionRepository;
    }
    async getSummary(issueRange) {
        const from = issueRange.from ? new Date(issueRange.from) : undefined;
        const to = issueRange.to ? new Date(issueRange.to) : undefined;
        const period = {
            from: issueRange.from ?? null,
            to: issueRange.to ?? null,
            appliesTo: 'issue.dateReported',
        };
        const totalIssues = await this.applyIssueReportedBetween(this.issueRepository.createQueryBuilder('issue'), from, to).getCount();
        const byStatusRaw = await this.applyIssueReportedBetween(this.issueRepository
            .createQueryBuilder('issue')
            .innerJoin('issue.currentStatus', 'st'), from, to)
            .select('st.name', 'name')
            .addSelect('COUNT(issue.id)', 'count')
            .groupBy('st.name')
            .getRawMany();
        const bySeverityRaw = await this.applyIssueReportedBetween(this.issueRepository.createQueryBuilder('issue'), from, to)
            .select('issue.severityLevel', 'severity')
            .addSelect('COUNT(issue.id)', 'count')
            .groupBy('issue.severityLevel')
            .getRawMany();
        const byChannelRaw = await this.applyIssueReportedBetween(this.issueRepository.createQueryBuilder('issue'), from, to)
            .select('issue.reportChannel', 'channel')
            .addSelect('COUNT(issue.id)', 'count')
            .groupBy('issue.reportChannel')
            .getRawMany();
        const byAreaRaw = await this.applyIssueReportedBetween(this.issueRepository
            .createQueryBuilder('issue')
            .leftJoin('issue.location', 'loc'), from, to)
            .select(`COALESCE(loc.serviceArea, '(none)')`, 'area')
            .addSelect('COUNT(issue.id)', 'count')
            .groupBy(`COALESCE(loc.serviceArea, '(none)')`)
            .getRawMany();
        return {
            period,
            totals: { issues: totalIssues },
            byStatus: this.toCountMap(byStatusRaw, 'name'),
            bySeverity: this.toCountMap(bySeverityRaw, 'severity'),
            byReportChannel: this.toCountMap(byChannelRaw, 'channel'),
            byServiceArea: this.toCountMap(byAreaRaw, 'area'),
        };
    }
    async getResolutionStats(range) {
        const from = range.from ? new Date(range.from) : undefined;
        const to = range.to ? new Date(range.to) : undefined;
        const period = {
            from: range.from ?? null,
            to: range.to ?? null,
            appliesTo: 'resolution.dateResolved',
        };
        const qb = this.resolutionRepository
            .createQueryBuilder('r')
            .innerJoin('r.issue', 'i');
        this.applyResolutionResolvedBetween(qb, from, to);
        const resolvedCount = await this.applyResolutionResolvedBetween(this.resolutionRepository
            .createQueryBuilder('r')
            .innerJoin('r.issue', 'i'), from, to).getCount();
        const avgRow = await this.applyResolutionResolvedBetween(this.resolutionRepository
            .createQueryBuilder('r')
            .innerJoin('r.issue', 'i'), from, to)
            .select('AVG(TIMESTAMPDIFF(HOUR, i.dateReported, r.dateResolved))', 'avgHours')
            .getRawOne();
        const avgHours = avgRow?.avgHours != null ? Number(avgRow.avgHours) : null;
        return {
            period,
            resolvedCount,
            avgHoursReportedToResolved: Number.isFinite(avgHours) ? avgHours : null,
        };
    }
    async getIssuesByMonth(issueRange) {
        const from = issueRange.from ? new Date(issueRange.from) : undefined;
        const to = issueRange.to ? new Date(issueRange.to) : undefined;
        const period = {
            from: issueRange.from ?? null,
            to: issueRange.to ?? null,
            appliesTo: 'issue.dateReported',
        };
        const rows = await this.applyIssueReportedBetween(this.issueRepository.createQueryBuilder('issue'), from, to)
            .select(`DATE_FORMAT(issue.dateReported, '%Y-%m')`, 'month')
            .addSelect('COUNT(issue.id)', 'count')
            .groupBy(`DATE_FORMAT(issue.dateReported, '%Y-%m')`)
            .orderBy('month', 'ASC')
            .getRawMany();
        return {
            period,
            issuesByMonth: rows.map((r) => ({
                month: r.month,
                count: Number(r.count),
            })),
        };
    }
    applyIssueReportedBetween(qb, from, to) {
        if (from) {
            qb.andWhere('issue.dateReported >= :from', { from });
        }
        if (to) {
            qb.andWhere('issue.dateReported <= :to', { to });
        }
        return qb;
    }
    applyResolutionResolvedBetween(qb, from, to) {
        if (from) {
            qb.andWhere('r.dateResolved >= :rFrom', { rFrom: from });
        }
        if (to) {
            qb.andWhere('r.dateResolved <= :rTo', { rTo: to });
        }
        return qb;
    }
    toCountMap(rows, key) {
        const out = {};
        for (const row of rows) {
            const k = row[key];
            if (k != null) {
                out[String(k)] = Number(row.count);
            }
        }
        return out;
    }
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(issue_entity_1.Issue)),
    __param(1, (0, typeorm_1.InjectRepository)(resolution_entity_1.Resolution)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ReportService);
//# sourceMappingURL=report.service.js.map