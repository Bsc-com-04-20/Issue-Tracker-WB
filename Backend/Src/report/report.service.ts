import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Issue } from '../issue/issue.entity';
import { Resolution } from '../issue/resolution.entity';
import { User } from '../user/user.entity';
import { Role } from '../common/enums/role.enum';
import {
  ReportDateRangeQueryDto,
  ResolutionReportDateRangeQueryDto,
  SubcategoryAnalyticsQueryDto,
} from './dto/report-date-range.query.dto';

export type ReportPeriodMeta = {
  from: string | null;
  to: string | null;
  appliesTo: 'issue.dateReported' | 'resolution.dateResolved';
};

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    @InjectRepository(Resolution)
    private readonly resolutionRepository: Repository<Resolution>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getSummary(issueRange: ReportDateRangeQueryDto) {
    const from = issueRange.from ? new Date(issueRange.from) : undefined;
    const to = issueRange.to ? new Date(issueRange.to) : undefined;

    const period: ReportPeriodMeta = {
      from: issueRange.from ?? null,
      to: issueRange.to ?? null,
      appliesTo: 'issue.dateReported',
    };

    const totalIssues = await this.applyIssueReportedBetween(
      this.issueRepository.createQueryBuilder('issue'),
      from,
      to,
    ).getCount();

    const byStatusRaw = await this.applyIssueReportedBetween(
      this.issueRepository
        .createQueryBuilder('issue')
        .innerJoin('issue.currentStatus', 'st'),
      from,
      to,
    )
      .select('st.name', 'name')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy('st.name')
      .getRawMany<{ name: string; count: string }>();

    const bySeverityRaw = await this.applyIssueReportedBetween(
      this.issueRepository.createQueryBuilder('issue'),
      from,
      to,
    )
      .select('issue.severityLevel', 'severity')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy('issue.severityLevel')
      .getRawMany<{ severity: string; count: string }>();

    const byChannelRaw = await this.applyIssueReportedBetween(
      this.issueRepository.createQueryBuilder('issue'),
      from,
      to,
    )
      .select('issue.reportChannel', 'channel')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy('issue.reportChannel')
      .getRawMany<{ channel: string; count: string }>();

    const byAreaRaw = await this.applyIssueReportedBetween(
      this.issueRepository
        .createQueryBuilder('issue')
        .leftJoin('issue.location', 'loc'),
      from,
      to,
    )
      .select(`COALESCE(loc.serviceArea, '(none)')`, 'area')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy(`COALESCE(loc.serviceArea, '(none)')`)
      .getRawMany<{ area: string; count: string }>();

    const byCategoryRaw = await this.applyIssueReportedBetween(
      this.issueRepository.createQueryBuilder('issue'),
      from,
      to,
    )
      .select('issue.issueCategory', 'category')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy('issue.issueCategory')
      .getRawMany<{ category: string; count: string }>();

    const byDepartmentRaw = await this.applyIssueReportedBetween(
      this.issueRepository.createQueryBuilder('issue'),
      from,
      to,
    )
      .select('issue.assignedDepartment', 'department')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy('issue.assignedDepartment')
      .getRawMany<{ department: string; count: string }>();

    const bySubcategoryRaw = await this.applyIssueReportedBetween(
      this.issueRepository.createQueryBuilder('issue'),
      from,
      to,
    )
      .select(`COALESCE(issue.issueSubcategory, '(none)')`, 'subcategory')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy(`COALESCE(issue.issueSubcategory, '(none)')`)
      .getRawMany<{ subcategory: string; count: string }>();

    return {
      period,
      totals: { issues: totalIssues },
      byStatus: this.toCountMap(byStatusRaw, 'name'),
      bySeverity: this.toCountMap(bySeverityRaw, 'severity'),
      byReportChannel: this.toCountMap(byChannelRaw, 'channel'),
      byServiceArea: this.toCountMap(byAreaRaw, 'area'),
      byCategory: this.toCountMap(byCategoryRaw, 'category'),
      bySubcategory: this.toCountMap(bySubcategoryRaw, 'subcategory'),
      byDepartment: this.toCountMap(byDepartmentRaw, 'department'),
    };
  }

  async getResolutionStats(range: ResolutionReportDateRangeQueryDto) {
    const from = range.from ? new Date(range.from) : undefined;
    const to = range.to ? new Date(range.to) : undefined;

    const period: ReportPeriodMeta = {
      from: range.from ?? null,
      to: range.to ?? null,
      appliesTo: 'resolution.dateResolved',
    };

    const qb = this.resolutionRepository
      .createQueryBuilder('r')
      .innerJoin('r.issue', 'i');

    this.applyResolutionResolvedBetween(qb, from, to);

    const resolvedCount = await this.applyResolutionResolvedBetween(
      this.resolutionRepository
        .createQueryBuilder('r')
        .innerJoin('r.issue', 'i'),
      from,
      to,
    ).getCount();

    const avgRow = await this.applyResolutionResolvedBetween(
      this.resolutionRepository
        .createQueryBuilder('r')
        .innerJoin('r.issue', 'i'),
      from,
      to,
    )
      .select(
        'AVG(TIMESTAMPDIFF(HOUR, i.dateReported, r.dateResolved))',
        'avgHours',
      )
      .getRawOne<{ avgHours: string | null }>();

    const avgHours =
      avgRow?.avgHours != null ? Number(avgRow.avgHours) : null;

    return {
      period,
      resolvedCount,
      avgHoursReportedToResolved: Number.isFinite(avgHours) ? avgHours : null,
    };
  }

  async getIssuesByMonth(issueRange: ReportDateRangeQueryDto) {
    const from = issueRange.from ? new Date(issueRange.from) : undefined;
    const to = issueRange.to ? new Date(issueRange.to) : undefined;

    const period: ReportPeriodMeta = {
      from: issueRange.from ?? null,
      to: issueRange.to ?? null,
      appliesTo: 'issue.dateReported',
    };

    const rows = await this.applyIssueReportedBetween(
      this.issueRepository.createQueryBuilder('issue'),
      from,
      to,
    )
      .select(`DATE_FORMAT(issue.dateReported, '%Y-%m')`, 'month')
      .addSelect('COUNT(issue.id)', 'count')
      .groupBy(`DATE_FORMAT(issue.dateReported, '%Y-%m')`)
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; count: string }>();

    return {
      period,
      issuesByMonth: rows.map((r) => ({
        month: r.month,
        count: Number(r.count),
      })),
    };
  }

  async getTopFailingSubcategories(query: SubcategoryAnalyticsQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const limit = query.limit ?? 5;

    const rows = await this.applyIssueReportedBetween(
      this.issueRepository
        .createQueryBuilder('issue')
        .innerJoin('issue.currentStatus', 'st'),
      from,
      to,
    )
      .andWhere('st.name NOT IN (:...terminal)', {
        terminal: ['resolved', 'closed'],
      })
      .select(`COALESCE(issue.issueSubcategory, '(none)')`, 'subcategory')
      .addSelect('COUNT(issue.id)', 'openCount')
      .groupBy(`COALESCE(issue.issueSubcategory, '(none)')`)
      .orderBy('openCount', 'DESC')
      .limit(limit)
      .getRawMany<{ subcategory: string; openCount: string }>();

    return {
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
        appliesTo: 'issue.dateReported' as const,
      },
      items: rows.map((r) => ({
        subcategory: r.subcategory,
        openCount: Number(r.openCount),
      })),
    };
  }

  async getResolutionBySubcategory(range: ResolutionReportDateRangeQueryDto) {
    const from = range.from ? new Date(range.from) : undefined;
    const to = range.to ? new Date(range.to) : undefined;

    const rows = await this.applyResolutionResolvedBetween(
      this.resolutionRepository
        .createQueryBuilder('r')
        .innerJoin('r.issue', 'i'),
      from,
      to,
    )
      .select(`COALESCE(i.issueSubcategory, '(none)')`, 'subcategory')
      .addSelect('COUNT(r.id)', 'resolvedCount')
      .addSelect(
        'AVG(TIMESTAMPDIFF(HOUR, i.dateReported, r.dateResolved))',
        'avgHours',
      )
      .groupBy(`COALESCE(i.issueSubcategory, '(none)')`)
      .orderBy('resolvedCount', 'DESC')
      .getRawMany<{
        subcategory: string;
        resolvedCount: string;
        avgHours: string | null;
      }>();

    return {
      period: {
        from: range.from ?? null,
        to: range.to ?? null,
        appliesTo: 'resolution.dateResolved' as const,
      },
      items: rows.map((r) => ({
        subcategory: r.subcategory,
        resolvedCount: Number(r.resolvedCount),
        avgHoursReportedToResolved:
          r.avgHours != null ? Number(r.avgHours) : null,
      })),
    };
  }

  async getDepartmentSlaBySubcategory(query: SubcategoryAnalyticsQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const slaHours = query.slaHours ?? 72;

    const rows = await this.applyResolutionResolvedBetween(
      this.resolutionRepository
        .createQueryBuilder('r')
        .innerJoin('r.issue', 'i'),
      from,
      to,
    )
      .select('i.assignedDepartment', 'department')
      .addSelect(`COALESCE(i.issueSubcategory, '(none)')`, 'subcategory')
      .addSelect('COUNT(r.id)', 'resolvedCount')
      .addSelect(
        `SUM(CASE WHEN TIMESTAMPDIFF(HOUR, i.dateReported, r.dateResolved) <= :slaHours THEN 1 ELSE 0 END)`,
        'withinSlaCount',
      )
      .setParameter('slaHours', slaHours)
      .groupBy('i.assignedDepartment')
      .addGroupBy(`COALESCE(i.issueSubcategory, '(none)')`)
      .orderBy('resolvedCount', 'DESC')
      .getRawMany<{
        department: string;
        subcategory: string;
        resolvedCount: string;
        withinSlaCount: string;
      }>();

    return {
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
        appliesTo: 'resolution.dateResolved' as const,
      },
      slaHours,
      items: rows.map((r) => {
        const resolvedCount = Number(r.resolvedCount);
        const withinSlaCount = Number(r.withinSlaCount);
        return {
          department: r.department,
          subcategory: r.subcategory,
          resolvedCount,
          withinSlaCount,
          slaRatePercent:
            resolvedCount > 0 ? Number(((withinSlaCount / resolvedCount) * 100).toFixed(1)) : 0,
        };
      }),
    };
  }

  async getOperationalPulse() {
    const now = new Date();
    const openBreached = await this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.currentStatus', 'st')
      .where('st.name NOT IN (:...t)', { t: ['resolved', 'closed'] })
      .andWhere('issue.slaBreachedAt IS NOT NULL')
      .getCount();

    const openOverdueNotStamped = await this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.currentStatus', 'st')
      .where('st.name NOT IN (:...t2)', { t2: ['resolved', 'closed'] })
      .andWhere('issue.slaResolutionDueAt IS NOT NULL')
      .andWhere('issue.slaResolutionDueAt < :now', { now })
      .andWhere('issue.slaBreachedAt IS NULL')
      .getCount();

    const techRows = await this.userRepository
      .createQueryBuilder('u')
      .select('u.id', 'technicianId')
      .addSelect('u.name', 'technicianName')
      .addSelect(
        `(
          SELECT COUNT(DISTINCT i.id)
          FROM issues i
          INNER JOIN statuses s ON s.id = i.currentStatusId
          INNER JOIN assignments a ON a.issueId = i.id
          WHERE a.assignedToId = u.id
            AND s.name IN ('assigned', 'in_progress')
            AND a.id = (SELECT MAX(ax.id) FROM assignments ax WHERE ax.issueId = i.id)
        )`,
        'activeAssignments',
      )
      .where('u.role = :r', { r: Role.TECHNICIAN })
      .andWhere('u.isActive = :a', { a: true })
      .orderBy('activeAssignments', 'DESC')
      .addOrderBy('u.name', 'ASC')
      .getRawMany<{
        technicianId: string;
        technicianName: string;
        activeAssignments: string;
      }>();

    const startUtc = new Date();
    startUtc.setUTCHours(0, 0, 0, 0);
    const resolvedTodayCount = await this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin(Resolution, 'res', 'res.issueId = issue.id')
      .innerJoin('issue.currentStatus', 'st')
      .where('st.name = :rs', { rs: 'resolved' })
      .andWhere('res.dateResolved >= :start', { start: startUtc })
      .getCount();

    return {
      generatedAt: now.toISOString(),
      openIssuesSlaBreached: openBreached,
      openIssuesPastResolutionDueNotStamped: openOverdueNotStamped,
      resolvedTodayCount,
      technicianWorkload: techRows.map((row) => ({
        technicianId: Number(row.technicianId),
        technicianName: row.technicianName,
        activeAssignments: Number(row.activeAssignments),
      })),
    };
  }

  async getGeoHotspots(limit = 24) {
    const cap = Math.min(Math.max(1, limit), 100);
    const rows = await this.issueRepository
      .createQueryBuilder('issue')
      .innerJoin('issue.location', 'loc')
      .select('ROUND(loc.latitude, 2)', 'lat')
      .addSelect('ROUND(loc.longitude, 2)', 'lng')
      .addSelect('COUNT(issue.id)', 'issueCount')
      .groupBy('ROUND(loc.latitude, 2)')
      .addGroupBy('ROUND(loc.longitude, 2)')
      .orderBy('issueCount', 'DESC')
      .limit(cap)
      .getRawMany<{ lat: string; lng: string; issueCount: string }>();

    return {
      items: rows.map((r) => ({
        latitude: Number(r.lat),
        longitude: Number(r.lng),
        issueCount: Number(r.issueCount),
      })),
    };
  }

  private applyIssueReportedBetween(
    qb: SelectQueryBuilder<Issue>,
    from?: Date,
    to?: Date,
  ): SelectQueryBuilder<Issue> {
    if (from) {
      qb.andWhere('issue.dateReported >= :from', { from });
    }
    if (to) {
      qb.andWhere('issue.dateReported <= :to', { to });
    }
    return qb;
  }

  private applyResolutionResolvedBetween(
    qb: SelectQueryBuilder<Resolution>,
    from?: Date,
    to?: Date,
  ): SelectQueryBuilder<Resolution> {
    if (from) {
      qb.andWhere('r.dateResolved >= :rFrom', { rFrom: from });
    }
    if (to) {
      qb.andWhere('r.dateResolved <= :rTo', { rTo: to });
    }
    return qb;
  }

  private toCountMap(
    rows: { count: string }[],
    key:
      | 'name'
      | 'severity'
      | 'channel'
      | 'area'
      | 'category'
      | 'subcategory'
      | 'department',
  ): Record<string, number> {
    const out: Record<string, number> = {};
    for (const row of rows) {
      const k = (row as Record<string, string>)[key];
      if (k != null) {
        out[String(k)] = Number(row.count);
      }
    }
    return out;
  }
}
