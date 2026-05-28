import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { KeyRound, Pencil, Plus, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, parseJson } from '@/lib/api';
import {
  canManageUsers,
  isDepartmentSpecialistRole,
} from '@/lib/auth';
import type { UserRow, UsersListResponse } from '@/lib/types';

const PAGE = 12;
const ROLES = [
  'admin',
  'supervisor',
  'technician',
] as const;

const TECHNICIAN_DEPARTMENTS = [
  { label: 'Infrastructure Issues', value: 'maintenance_department' },
  { label: 'Water Quality', value: 'water_quality_unit' },
  { label: 'Billing and Accounts', value: 'billing_department' },
  { label: 'Metering', value: 'metering_unit' },
] as const;

export function UsersPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  if (!canManageUsers(role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [pwdUser, setPwdUser] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = page * PAGE;
      const res = await apiFetch(`/user?skip=${skip}&take=${PAGE}`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await parseJson<UsersListResponse>(res);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User accounts</h1>
          <p className="mt-1 text-slate-600">
            Create staff accounts, update roles, and reset passwords (admin only).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          New user
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No users.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {u.role.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.phone}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.department ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          u.isActive
                            ? 'text-emerald-600'
                            : 'text-slate-400 line-through'
                        }
                      >
                        {u.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setEditUser(u)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPwdUser(u)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          <KeyRound className="h-3 w-3" />
                          Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            Page {page + 1} of {pages} · {total} users
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {createOpen && (
        <UserFormModal
          title="Create user"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void load();
          }}
          mode="create"
        />
      )}
      {editUser && (
        <UserFormModal
          key={editUser.id}
          title={`Edit ${editUser.name}`}
          initial={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            void load();
          }}
          mode="edit"
        />
      )}
      {pwdUser && (
        <PasswordModal
          user={pwdUser}
          onClose={() => setPwdUser(null)}
          onSaved={() => setPwdUser(null)}
        />
      )}
    </div>
  );
}

function UserFormModal({
  title,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  title: string;
  mode: 'create' | 'edit';
  initial?: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [userRole, setUserRole] = useState(initial?.role ?? 'intake_officer');
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const technicianSelected = userRole === 'technician';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (technicianSelected && !department) {
      setErr('Select the technician department.');
      return;
    }
    setPending(true);
    try {
      if (mode === 'create') {
        const res = await apiFetch('/user', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email: email.trim(),
            phone,
            role: userRole,
            department: department.trim() || undefined,
            password,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            (j as { message?: string | string[] }).message?.toString() ||
              'Create failed',
          );
        }
      } else if (initial) {
        const body: Record<string, unknown> = {
          name,
          email: email.trim(),
          phone,
          role: userRole,
          department: department.trim() || null,
          isActive,
        };
        const res = await apiFetch(`/user/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            (j as { message?: string | string[] }).message?.toString() ||
              'Update failed',
          );
        }
      }
      onSaved();
    } catch (er) {
      setErr(er instanceof Error ? er.message : 'Request failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {err && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Phone</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Role</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm capitalize"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Department
            </label>
            {technicianSelected ? (
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select technician department…</option>
                {TECHNICIAN_DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. metering_unit, maintenance_department"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            )}
            {isDepartmentSpecialistRole(userRole) && (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                Set this to the same <strong>assignedDepartment</strong> routing key as
                issues in your unit (e.g.{' '}
                <code className="rounded bg-slate-100 px-1">billing_department</code>,{' '}
                <code className="rounded bg-slate-100 px-1">metering_unit</code>,{' '}
                <code className="rounded bg-slate-100 px-1">water_quality_unit</code>
                ). Required for <strong>department_officer</strong> queue and scoped actions.
              </p>
            )}
          </div>
          {mode === 'create' && (
            <div>
              <label className="text-xs font-medium text-slate-600">
                Initial password (min 6 chars)
              </label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          )}
          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Account active (can sign in)
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {pending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const res = await apiFetch(`/user/${user.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword: pwd }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { message?: string }).message || 'Reset failed',
        );
      }
      onSaved();
    } catch (er) {
      setErr(er instanceof Error ? er.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Reset password — {user.name}
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {err && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">
              New password (min 6)
            </label>
            <input
              required
              type="password"
              minLength={6}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
