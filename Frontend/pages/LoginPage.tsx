import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  HardHat,
  Home,
  LockKeyhole,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { dashboardRouteForRole } from '@/lib/auth';

const staffRoles = [
  {
    key: 'admin',
    label: 'Admin',
    workspace: 'Users, reports, audit, and system configuration',
    icon: UserCog,
    demoEmail: 'admin@local.dev',
    demoPassword: 'admin123',
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    workspace: 'Dispatch oversight, SLA review, closure, and reports',
    icon: ShieldCheck,
  },
  {
    key: 'technician',
    label: 'Technician',
    workspace: 'Assigned field work, progress updates, and resolutions',
    icon: HardHat,
  },
];

const SelectedRoleIcon = ({ roleKey }: { roleKey: string }) => {
  const role = staffRoles.find((item) => item.key === roleKey) ?? staffRoles[0];
  const Icon = role.icon;
  return <Icon className="h-6 w-6" />;
};

export function LoginPage() {
  const { user, login, clearSessionForLogin, ready } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState(staffRoles[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const forceSignIn = searchParams.get('switch') === '1';

  useEffect(() => {
    if (forceSignIn) {
      clearSessionForLogin();
    }
  }, [forceSignIn, clearSessionForLogin]);

  if (ready && user && !forceSignIn) {
    return <Navigate to={dashboardRouteForRole(user.role)} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-10 w-10 text-[#0b5fa5]" />
          <span className="text-2xl font-bold text-[#0b5fa5]">IssueTracker</span>
        </div>
      </div>

      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <section className="bg-[#0b5fa5] p-6 text-white sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Choose your staff role</h1>
                <p className="text-sm text-white/75">
                  Select the workspace you are signing into.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {staffRoles.map((role) => {
                const Icon = role.icon;
                const active = selectedRole.key === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setError(null);
                      if (role.demoEmail && role.demoPassword) {
                        setEmail(role.demoEmail);
                        setPassword(role.demoPassword);
                      }
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? 'border-white bg-white text-[#0b5fa5] shadow-lg'
                        : 'border-white/15 bg-white/8 text-white hover:bg-white/14'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          active ? 'bg-[#e8f4ff]' : 'bg-white/12'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-bold">{role.label}</span>
                    </span>
                    <span
                      className={`mt-3 block text-sm leading-5 ${
                        active ? 'text-slate-600' : 'text-white/76'
                      }`}
                    >
                      {role.workspace}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="relative overflow-hidden p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-[#e8f4ff]" aria-hidden />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b5fa5] text-white shadow-lg">
                <SelectedRoleIcon roleKey={selectedRole.key} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {selectedRole.label} sign in
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your staff credentials and continue straight into the right water-board
                workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f4ff] px-3 py-1.5 text-xs font-bold text-[#0b5fa5]">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Secure access
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  Role guided
                </span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#0b5fa5] focus:ring-2"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-[#0b5fa5] focus:ring-2"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b5fa5] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#084f8b] disabled:opacity-60"
              >
                {pending ? 'Signing in...' : `Sign in as ${selectedRole.label}`}
                {!pending && <ArrowRight className="h-4 w-4" />}
              </button>
              <Link
                to="/report"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-[#0b5fa5] shadow-sm hover:bg-[#eef7ff]"
              >
                <Home className="h-4 w-4" />
                Back to home
              </Link>
            </form>
          </section>
        </div>
      </div>

      <p className="mt-5 max-w-md text-center text-xs leading-5 text-slate-500">
        Your actual permissions come from your staff account after login. The role buttons help
        you choose the right workspace before signing in.
      </p>
    </div>
  );
}
