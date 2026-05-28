import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, CreditCard, Droplets, Gauge, ArrowLeft, UserPlus, CheckCircle2, Loader2, X } from 'lucide-react';
import { apiFetch, parseJson } from '@/lib/api';
import { isSupervisorOrManagerRole } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import { issueKey } from '@/lib/issueKey';
import type { IssuesPageResponse, IssueRow, TechnicianWithDept, SuggestedTechniciansResponse } from '@/lib/types';

const ISSUE_PAGE_SIZE = 100;

const URGENCY_WEIGHTS: Record<string, number> = {
  critical: 4,
  urgent: 3,
  high: 2,
  normal: 1,
  low: 0,
};

type CategoryKey = 'infrastructure_maintenance' | 'billing_account' | 'water_quality' | 'metering';

const DEPT_MAPPING: Record<CategoryKey, string> = {
  infrastructure_maintenance: 'maintenance_department',
  billing_account: 'billing_department',
  water_quality: 'water_quality_unit',
  metering: 'metering_unit',
};

const CATEGORY_BY_DEPT: Record<string, CategoryKey> = {
  maintenance_department: 'infrastructure_maintenance',
  billing_department: 'billing_account',
  water_quality_unit: 'water_quality',
  metering_unit: 'metering',
};

export function SupervisorDashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [reportedPage, setReportedPage] = useState<IssuesPageResponse | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianWithDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedIssueForAssign, setSelectedIssueForAssign] = useState<IssueRow | null>(null);
  const [suggestedTechs, setSuggestedTechs] = useState<any[]>([]);
  const [assigningTechId, setAssigningTechId] = useState<number | null>(null);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  if (!isSupervisorOrManagerRole(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    const reportedQ = `/issue?skip=0&take=${ISSUE_PAGE_SIZE}&status=reported`;
    const [rep, techRes] = await Promise.all([
      apiFetch(reportedQ),
      apiFetch('/user/technicians/with-home'),
    ]);
    if (rep.ok) setReportedPage(await parseJson<IssuesPageResponse>(rep));
    if (techRes.ok) setTechnicians(await parseJson<any[]>(techRes));
    setLoading(false);
  }, []);

  // Automatically redirect supervisor to their department's queue on load
  useEffect(() => {
    if (user?.department && !selectedCategory) {
      const autoCategory = CATEGORY_BY_DEPT[user.department];
      if (autoCategory) {
        setSelectedCategory(autoCategory);
      }
    }
  }, [user?.department, selectedCategory]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dispatchQueue = reportedPage?.items ?? [];

  const filteredIssues = useMemo(() => {
    if (!selectedCategory) return [];
    return dispatchQueue
      .filter((i) => 
        // Filter by assigned department to reflect automatic routing results
        i.assignedDepartment === DEPT_MAPPING[selectedCategory] || 
        i.issueCategory === selectedCategory)
      .sort((a, b) => {
        const wa = URGENCY_WEIGHTS[a.urgencyLevel.toLowerCase()] ?? 0;
        const wb = URGENCY_WEIGHTS[b.urgencyLevel.toLowerCase()] ?? 0;
        return wb - wa;
      });
  }, [dispatchQueue, selectedCategory]);

  const filteredTechs = useMemo(() => {
    if (!selectedCategory) return [];
    const targetDept = DEPT_MAPPING[selectedCategory];
    return technicians.filter((t) => t.department === targetDept);
  }, [technicians, selectedCategory]);

  async function handleAssign(issueId: number, techId: string) {
    if (!techId) return;
    setAssigningTechId(Number(techId));
    setActionMsg(null);
    try {
      const res = await apiFetch('/assignment', {
        method: 'POST',
        body: JSON.stringify({
          issueId,
          assignedToUserId: Number(techId),
          priorityLevel: 'medium',
        }),
      });
      if (res.ok) {
        setActionMsg(`Issue ${issueKey(issueId)} assigned successfully.`);
        await loadData();
        setSelectedIssueForAssign(null);
        setSuggestedTechs([]);
      } else {
        setActionMsg('Assignment failed. Please try again.');
      }
    } finally {
      setAssigningTechId(null);
    }
  }

  async function openAssignmentModal(issue: IssueRow) {
    setSelectedIssueForAssign(issue);
    setShowAssignModal(true);
    setLoadingSuggested(true);
    setSuggestedTechs([]);
    try {
      const res = await apiFetch(`/issue/${issue.id}/suggested-technicians`);
      if (res.ok) {
        const data = await parseJson<SuggestedTechniciansResponse>(res);
        setSuggestedTechs(data.ranked ?? []);
      } else {
        setSuggestedTechs(filteredTechs);
      }
    } catch {
      setSuggestedTechs(filteredTechs);
    } finally {
      setLoadingSuggested(false);
    }
  }

  function closeAssignmentModal() {
    setSelectedIssueForAssign(null);
    setSuggestedTechs([]);
    setAssigningTechId(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Supervisor workspace</h1>
        <p className="mt-1 text-slate-600">
          Select a department to manage and assign technician workloads.
        </p>
      </div>

      {actionMsg && (
        <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
          {actionMsg}
        </div>
      )}

      {!selectedCategory ? (
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryButton
            title="Infrastructure Issues"
            description="Repair, maintenance, and asset leaks."
            icon={<Building2 className="h-8 w-8 text-amber-600" />}
            count={dispatchQueue.filter(i => i.assignedDepartment === 'maintenance_department' || i.issueCategory === 'infrastructure_maintenance').length}
            onClick={() => setSelectedCategory('infrastructure_maintenance')}
          />
          <CategoryButton
            title="Billing & Account"
            description="Account reconciliation and disputes."
            icon={<CreditCard className="h-8 w-8 text-sky-600" />}
            count={dispatchQueue.filter(i => i.assignedDepartment === 'billing_department' || i.issueCategory === 'billing_account').length}
            onClick={() => setSelectedCategory('billing_account')}
          />
          <CategoryButton
            title="Water Quality"
            description="Sampling, lab tests, and contamination."
            icon={<Droplets className="h-8 w-8 text-blue-600" />}
            count={dispatchQueue.filter(i => i.assignedDepartment === 'water_quality_unit' || i.issueCategory === 'water_quality').length}
            onClick={() => setSelectedCategory('water_quality')}
          />
          <CategoryButton
            title="Metering"
            description="Meter faults, prepay tokens, and reads."
            icon={<Gauge className="h-8 w-8 text-emerald-600" />}
            count={dispatchQueue.filter(i => i.assignedDepartment === 'metering_unit' || i.issueCategory === 'metering').length}
            onClick={() => setSelectedCategory('metering')}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to categories
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              Assign issues
            </button>
          </div>

          {showAssignModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6 overflow-y-auto">
              <div className="max-w-3xl w-full rounded-xl bg-white shadow-xl my-8">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h3 className="font-semibold text-lg text-slate-900">Assign Issues to Technicians</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      closeAssignmentModal();
                    }}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedIssueForAssign ? (
                  <div className="p-6 space-y-4">
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                      <p className="text-xs font-semibold uppercase text-slate-500">Selected Issue</p>
                      <p className="mt-2 font-mono text-sm font-bold text-indigo-600">
                        {issueKey(selectedIssueForAssign.id)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {selectedIssueForAssign.description}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className="rounded bg-slate-200 px-2 py-1 text-xs font-bold uppercase text-slate-700">
                          {selectedIssueForAssign.issueCategory.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Select a Technician</h4>
                      {loadingSuggested ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                      ) : suggestedTechs.length === 0 ? (
                        <p className="text-sm text-slate-500">No technicians available for this issue.</p>
                      ) : (
                        <div className="space-y-2">
                          {suggestedTechs.map((tech: any) => (
                            <button
                              key={tech.id}
                              type="button"
                              onClick={() => void handleAssign(selectedIssueForAssign.id, String(tech.id))}
                              disabled={assigningTechId === tech.id}
                              className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-50"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-slate-900">{tech.name}</p>
                                  <p className="text-xs text-slate-500">{tech.department?.replace(/_/g, ' ')}</p>
                                </div>
                                {assigningTechId === tech.id && (
                                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => closeAssignmentModal()}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Back to Issues
                    </button>
                  </div>
                ) : (
                  <div className="p-6">
                    <h4 className="font-semibold text-slate-900 mb-3">Select an Issue to Assign</h4>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {filteredIssues.length === 0 ? (
                          <p className="text-sm text-slate-500">No issues to solve in this category.</p>
                      ) : (
                        filteredIssues.map((issue) => (
                          <button
                            key={issue.id}
                            type="button"
                            onClick={() => void openAssignmentModal(issue)}
                            className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-xs font-bold text-indigo-600">
                                  {issueKey(issue.id)}
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                  {issue.description}
                                </p>
                              </div>
                              <div className="text-slate-400 text-lg">→</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800 capitalize">
                {selectedCategory.replace(/_/g, ' ')} Queue
              </h2>
              <p className="text-sm text-slate-500">
                Issues assigned to {DEPT_MAPPING[selectedCategory].replace(/_/g, ' ')}
              </p>
            </div>

            <div className="divide-y divide-slate-100 p-2">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <p className="p-8 text-center text-slate-500">No issues to solve in this category.</p>
              ) : (
                filteredIssues.map((issue) => (
                  <div key={issue.id} className="p-4 transition-colors hover:bg-slate-50">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/app/issues/${issue.id}`}
                          className="font-mono text-xs font-bold text-indigo-600 hover:underline"
                        >
                          {issueKey(issue.id)}
                        </Link>
                        <p className="mt-1 text-sm font-medium text-slate-900">{issue.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <button
                          onClick={() => void openAssignmentModal(issue)}
                          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          <UserPlus className="h-4 w-4" />
                          Assign
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CategoryButton({
  title,
  description,
  icon,
  count,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-50 transition-colors group-hover:bg-indigo-50">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <div className="flex gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {count} {count === 1 ? 'issue' : 'issues'}
            </span>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600">
          View Queue <UserPlus className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}
