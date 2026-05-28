import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { apiFetch, parseJson } from '@/lib/api';
import { canAccessReports, canRunSlaBreachScan, isSupervisorOrManagerRole } from '@/lib/auth';
import type {
  DepartmentSlaBySubcategory,
  GeoHotspotsResponse,
  IssuesByMonth,
  OperationalPulse,
  ResolutionBySubcategory,
  ReportSummary,
  ResolutionStats,
  TopFailingSubcategories,
} from '@/lib/types';
import { Activity, TrendingUp } from 'lucide-react';

export function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [resolution, setResolution] = useState<ResolutionStats | null>(null);
  const [byMonth, setByMonth] = useState<IssuesByMonth | null>(null);
  const [topFailing, setTopFailing] = useState<TopFailingSubcategories | null>(null);
  const [resolutionBySubcategory, setResolutionBySubcategory] =
    useState<ResolutionBySubcategory | null>(null);
  const [departmentSla, setDepartmentSla] =
    useState<DepartmentSlaBySubcategory | null>(null);
  const [operationalPulse, setOperationalPulse] = useState<OperationalPulse | null>(
    null,
  );
  const [geoHotspots, setGeoHotspots] = useState<GeoHotspotsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [slaHours, setSlaHours] = useState('72');
  const [topLimit, setTopLimit] = useState('6');
  const [hotspotLimit, setHotspotLimit] = useState('20');
  const [reloadKey, setReloadKey] = useState(0);
  const [slaBatchMsg, setSlaBatchMsg] = useState<string | null>(null);
  const [slaBatchBusy, setSlaBatchBusy] = useState(false);

  const allowed = canAccessReports(role);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (fromDate) sp.set('from', new Date(`${fromDate}T00:00:00.000Z`).toISOString());
    if (toDate) sp.set('to', new Date(`${toDate}T23:59:59.999Z`).toISOString());
    return sp.toString();
  }, [fromDate, toDate]);

  const safeSlaHours = Math.max(1, Number(slaHours) || 72);
  const safeTopLimit = Math.max(1, Number(topLimit) || 6);
  const safeHotspotLimit = Math.min(100, Math.max(1, Number(hotspotLimit) || 20));

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const base = queryString ? `?${queryString}` : '';
        const [s, r, m, t, rs, ds, pulse, geo] = await Promise.all([
          apiFetch(`/report/summary${base}`),
          apiFetch(`/report/resolution-stats${base}`),
          apiFetch(`/report/issues-by-month${base}`),
          apiFetch(
            `/report/top-failing-subcategories${base ? `${base}&` : '?'}limit=${safeTopLimit}`,
          ),
          apiFetch(`/report/resolution-by-subcategory${base}`),
          apiFetch(
            `/report/department-sla-by-subcategory${base ? `${base}&` : '?'}slaHours=${safeSlaHours}`,
          ),
          apiFetch('/report/operational-pulse'),
          apiFetch(`/report/geo-hotspots?limit=${safeHotspotLimit}`),
        ]);
        if (cancelled) return;
        if (s.ok) setSummary(await parseJson<ReportSummary>(s));
        if (r.ok) setResolution(await parseJson<ResolutionStats>(r));
        if (m.ok) setByMonth(await parseJson<IssuesByMonth>(m));
        if (t.ok) setTopFailing(await parseJson<TopFailingSubcategories>(t));
        if (rs.ok) {
          setResolutionBySubcategory(await parseJson<ResolutionBySubcategory>(rs));
        }
        if (ds.ok) {
          setDepartmentSla(await parseJson<DepartmentSlaBySubcategory>(ds));
        }
        if (pulse.ok) {
          setOperationalPulse(await parseJson<OperationalPulse>(pulse));
        }
        if (geo.ok) {
          setGeoHotspots(await parseJson<GeoHotspotsResponse>(geo));
        }
      } catch {
        if (!cancelled) setError('Failed to load reports');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, queryString, safeSlaHours, safeTopLimit, safeHotspotLimit, reloadKey]);

  async function runSlaBreachesFromReports() {
    if (!canRunSlaBreachScan(role)) return;
    setSlaBatchBusy(true);
    setSlaBatchMsg(null);
    try {
      const res = await apiFetch('/issue/admin/process-sla-breaches', {
        method: 'POST',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() ||
            'SLA batch failed',
        );
      }
      const body = j as { scanned?: number; newlyBreached?: number };
      setSlaBatchMsg(
        `Scanned ${body.scanned ?? 0} open issues · ${body.newlyBreached ?? 0} newly stamped as breached.`,
      );
      setReloadKey((k) => k + 1);
    } catch (e) {
      setSlaBatchMsg(e instanceof Error ? e.message : 'SLA batch failed');
    } finally {
      setSlaBatchBusy(false);
    }
  }

  const geoHotspotChartData = useMemo(
    () =>
      (geoHotspots?.items ?? []).map((x) => ({
        name: `${x.latitude.toFixed(2)}, ${x.longitude.toFixed(2)}`,
        issueCount: x.issueCount,
      })),
    [geoHotspots],
  );

  const statusChartData = useMemo(() => {
    if (!summary?.byCategory) return [];
    return Object.entries(summary.byCategory).map(([name, count]) => ({
      name: name.replace(/_/g, ' '),
      count,
    }));
  }, [summary]);

  const departmentChartData = useMemo(() => {
    if (!summary?.byDepartment) return [];
    return Object.entries(summary.byDepartment).map(([name, count]) => ({
      name: name.replace(/_/g, ' '),
      count,
    }));
  }, [summary]);

  const monthChartData = useMemo(() => {
    return byMonth?.issuesByMonth ?? [];
  }, [byMonth]);

  const serviceAreaChartData = useMemo(() => {
    if (!summary?.byServiceArea) return [];
    return Object.entries(summary.byServiceArea)
      .map(([name, count]) => ({
        name: name.replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [summary]);

  const channelChartData = useMemo(() => {
    if (!summary?.byReportChannel) return [];
    return Object.entries(summary.byReportChannel).map(([name, count]) => ({
      name: name.replace(/_/g, ' '),
      count,
    }));
  }, [summary]);

  const topFailingChartData = useMemo(
    () =>
      (topFailing?.items ?? []).map((x) => ({
        name: x.subcategory.replace(/_/g, ' '),
        openCount: x.openCount,
      })),
    [topFailing],
  );

  const resolutionSubcategoryData = useMemo(
    () =>
      (resolutionBySubcategory?.items ?? []).slice(0, 8).map((x) => ({
        name: x.subcategory.replace(/_/g, ' '),
        avgHours: x.avgHoursReportedToResolved ?? 0,
      })),
    [resolutionBySubcategory],
  );

  if (!allowed) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        Reports are available to supervisors and administrators.
      </div>
    );
  }

  const avgDays =
    resolution?.avgHoursReportedToResolved != null
      ? (resolution.avgHoursReportedToResolved / 24).toFixed(1)
      : '—';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            Reports & analytics
          </h1>
          <p className="mt-1 text-slate-600">
            Volume, resolution performance, live SLA load, and map-coordinate
            complaint density.
          </p>
          {isSupervisorOrManagerRole(role) && (
            <p className="mt-2 text-sm text-slate-500">
              For dispatch queues and intake escalations, use the{' '}
              <Link to="/app/dashboard/supervisor" className="font-semibold text-indigo-600 hover:underline">
                supervisor workspace
              </Link>
              .
            </p>
          )}
          {slaBatchMsg ? (
            <p className="mt-2 text-sm text-slate-600">{slaBatchMsg}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              From date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              To date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              SLA hours
            </label>
            <input
              type="number"
              min={1}
              value={slaHours}
              onChange={(e) => setSlaHours(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Top failing limit
            </label>
            <input
              type="number"
              min={1}
              value={topLimit}
              onChange={(e) => setTopLimit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              Geo hotspot limit
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={hotspotLimit}
              onChange={(e) => setHotspotLimit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSlaHours('72');
                setTopLimit('6');
                setHotspotLimit('20');
              }}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Operational pulse</h2>
          <p className="text-sm text-slate-500">
            Open-issue SLA signals and technician assignment load (not filtered by
            date range).
          </p>
          {operationalPulse?.generatedAt ? (
            <p className="mt-1 text-xs text-slate-400">
              Generated {operationalPulse.generatedAt}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Open · SLA breached"
              value={operationalPulse?.openIssuesSlaBreached ?? '—'}
              trend="Stamped breach on open tickets"
              trendUp={false}
              icon={Activity}
            />
            <StatCard
              title="Open · past due (not stamped)"
              value={operationalPulse?.openIssuesPastResolutionDueNotStamped ?? '—'}
              trend="Awaiting breach stamp / batch"
              trendUp={false}
              icon={TrendingUp}
            />
            <StatCard
              title="Resolved today (UTC)"
              value={operationalPulse?.resolvedTodayCount ?? '—'}
              trend="From resolution timestamps"
              trendUp={undefined}
              icon={Activity}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Technician</th>
                  <th className="px-2 py-2">Active assignments</th>
                </tr>
              </thead>
              <tbody>
                {(operationalPulse?.technicianWorkload ?? [])
                  .filter((w) => w.activeAssignments > 0)
                  .slice(0, 20)
                  .map((w) => (
                    <tr
                      key={w.technicianId}
                      className="border-b border-slate-100"
                    >
                      <td className="px-2 py-2">{w.technicianName}</td>
                      <td className="px-2 py-2">{w.activeAssignments}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {(operationalPulse?.technicianWorkload ?? []).every(
              (w) => w.activeAssignments === 0,
            ) ? (
              <p className="mt-2 text-sm text-slate-500">
                No active assigned / in-progress work on the roster.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Geo hotspots (rounded coordinates)
          </h2>
          <p className="text-sm text-slate-500">
            All-time density by ~1 km bins for dispatch planning.
          </p>
          <div className="mt-4 h-72">
            {geoHotspotChartData.length === 0 ? (
              <p className="text-sm text-slate-500">No geocoded issues yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={geoHotspotChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="issueCount"
                    name="Issues"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total issues (range)"
          value={summary?.totals.issues ?? '—'}
          trend="+1.2 from last month"
          trendUp
          icon={TrendingUp}
        />
        <StatCard
          title="Avg resolution time"
          value={avgDays === '—' ? '—' : `${avgDays} days`}
          trend="-0.5d faster closure"
          trendUp
          icon={Activity}
        />
        <StatCard
          title="Resolved count"
          value={resolution?.resolvedCount ?? '—'}
          trend="+2% success rate"
          trendUp
          icon={TrendingUp}
        />
        <StatCard
          title="Throughput"
          value={departmentChartData.length}
          trend="Departments receiving routed complaints"
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Issues by category
          </h2>
          <p className="text-sm text-slate-500">Current snapshot in selected period</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Issues"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Workload by department
          </h2>
          <p className="text-sm text-slate-500">
            How many complaints each unit is handling
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Issues"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Issues by month</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="count"
                name="Created"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Issue hotspots by service area
          </h2>
          <p className="text-sm text-slate-500">
            Top zones and communities with the most complaints
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceAreaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Issues"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Channel mix
          </h2>
          <p className="text-sm text-slate-500">
            Where customers are reporting from (phone, walk-in, WhatsApp, web)
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  name="Reports"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Top failing subcategories
          </h2>
          <p className="text-sm text-slate-500">
            Highest unresolved complaint types
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFailingChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="openCount"
                  name="Open issues"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Avg resolution by subcategory
          </h2>
          <p className="text-sm text-slate-500">
            Hours from report to resolved
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionSubcategoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="avgHours"
                  name="Avg hours"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Department SLA by subcategory
        </h2>
        <p className="text-sm text-slate-500">
          SLA target: {departmentSla?.slaHours ?? 72} hours
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Department</th>
                <th className="px-2 py-2">Subcategory</th>
                <th className="px-2 py-2">Resolved</th>
                <th className="px-2 py-2">Within SLA</th>
                <th className="px-2 py-2">SLA Rate</th>
              </tr>
            </thead>
            <tbody>
              {(departmentSla?.items ?? []).slice(0, 12).map((row) => (
                <tr key={`${row.department}-${row.subcategory}`} className="border-b border-slate-100">
                  <td className="px-2 py-2">{row.department.replace(/_/g, ' ')}</td>
                  <td className="px-2 py-2">{row.subcategory.replace(/_/g, ' ')}</td>
                  <td className="px-2 py-2">{row.resolvedCount}</td>
                  <td className="px-2 py-2">{row.withinSlaCount}</td>
                  <td className="px-2 py-2">{row.slaRatePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
