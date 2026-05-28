import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ListTodo, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, parseJson } from '@/lib/api';
import {
  dashboardRouteForRole,
  defaultDepartmentKeyForSpecialistRole,
  isDepartmentSpecialistRole,
} from '@/lib/auth';
import type { IssuesPageResponse } from '@/lib/types';

type ClassificationCategories = Record<
  string,
  { label: string; department: string; subcategories: string[] }
>;

function humanDept(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DepartmentDashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const deptKey =
    (user?.department && user.department.trim()) ||
    defaultDepartmentKeyForSpecialistRole(role) ||
    '';

  const [categories, setCategories] = useState<ClassificationCategories | null>(
    null,
  );
  const [preview, setPreview] = useState<IssuesPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = isDepartmentSpecialistRole(role);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [cRes, iRes] = await Promise.all([
          apiFetch('/issue/classification'),
          apiFetch('/issue?skip=0&take=8'),
        ]);
        if (cancelled) return;
        if (cRes.ok) {
          const c = await parseJson<{ categories: ClassificationCategories }>(
            cRes,
          );
          setCategories(c.categories ?? null);
        }
        if (iRes.ok) {
          setPreview(await parseJson<IssuesPageResponse>(iRes));
        } else {
          setPreview(null);
        }
      } catch {
        if (!cancelled) setError('Could not load your department workspace.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const myCategories = useMemo(() => {
    if (!categories || !deptKey) return [];
    return Object.entries(categories)
      .filter(([, v]) => v.department === deptKey)
      .map(([key, v]) => ({ key, label: v.label }));
  }, [categories, deptKey]);

  if (!allowed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-semibold">This page is for department specialists</p>
        <p className="mt-2 text-amber-900/90">
          Your role uses a different home workspace. Use the link below or the sidebar
          to open <strong>Dashboard</strong> or <strong>Issues</strong>.
        </p>
        <Link
          to={dashboardRouteForRole(role)}
          className="mt-4 inline-block text-sm font-semibold text-amber-950 underline"
        >
          Go to your dashboard
        </Link>
      </div>
    );
  }

  const openCount =
    preview?.items.filter((i) => i.currentStatus?.name !== 'closed').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My department workspace
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Issues assigned to{' '}
            <span className="font-semibold text-slate-800">
              {humanDept(deptKey)}
            </span>{' '}
            — the same routing used when customers pick matching categories.
          </p>
        </div>
        <Link
          to="/app/issues"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <ListTodo className="h-4 w-4" />
          Open full queue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800">
            <Building2 className="h-5 w-5 text-violet-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Categories you handle
            </h2>
          </div>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="mt-3 text-sm text-rose-700">{error}</p>
          ) : myCategories.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No categories map to this department key in classification. Ask an admin to
              set your user <strong>department</strong> to match issue routing (e.g.{' '}
              <code className="rounded bg-slate-100 px-1">metering_unit</code>,{' '}
              <code className="rounded bg-slate-100 px-1">billing_department</code>).
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-slate-800">
              {myCategories.map((c) => (
                <li
                  key={c.key}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                >
                  <span className="font-medium">{c.label}</span>
                  <span className="ml-2 text-xs text-slate-500">({c.key})</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent in your queue
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : !preview?.items.length ? (
            <p className="mt-3 text-sm text-slate-600">No issues yet in your filter.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {preview.items.map((i) => (
                <li key={i.id} className="py-2">
                  <Link
                    to={`/app/issues/${i.id}`}
                    className="text-sm font-medium text-indigo-700 hover:underline"
                  >
                    ISS-{i.id}
                  </Link>
                  <p className="line-clamp-2 text-xs text-slate-600">{i.description}</p>
                  <p className="text-xs capitalize text-slate-500">
                    {i.currentStatus?.name?.replace(/_/g, ' ') ?? '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Showing up to 8 newest tickets assigned to your department. Open the full
            queue for pagination and filters.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Non-closed in preview: {openCount}
          </p>
        </section>
      </div>
    </div>
  );
}
