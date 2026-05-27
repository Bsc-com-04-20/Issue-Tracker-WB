import { useAuth } from '@/context/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      <p className="mt-2 text-sm text-slate-600">
        Profile and workspace preferences will live here.
      </p>
      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-slate-500">Email</dt>
          <dd className="text-slate-900">{user?.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Role</dt>
          <dd className="capitalize text-slate-900">{user?.role}</dd>
        </div>
      </dl>
    </div>
  );
}
