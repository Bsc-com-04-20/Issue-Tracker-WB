import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Clock,
  Globe2,
  LockKeyhole,
  Mail,
  Moon,
  Phone,
  Save,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { dashboardRouteForRole } from '@/lib/auth';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ') || 'Unknown role';
}

type SavedSettings = {
  displayName: string;
  phone: string;
  emailUpdates: boolean;
  smsAlerts: boolean;
  compactView: boolean;
};

function settingsKey(email: string | undefined): string {
  return `issue_tracker_settings:${email ?? 'anonymous'}`;
}

export function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const storageKey = settingsKey(user?.email);
  const [displayName, setDisplayName] = useState(
    user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') ?? '',
  );
  const [phone, setPhone] = useState('');
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const fallbackName = user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') ?? '';
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setDisplayName(fallbackName);
      setPhone('');
      setEmailUpdates(true);
      setSmsAlerts(false);
      setCompactView(false);
      setLastSavedAt(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as SavedSettings & { savedAt?: string };
      setDisplayName(parsed.displayName || fallbackName);
      setPhone(parsed.phone || '');
      setEmailUpdates(parsed.emailUpdates ?? true);
      setSmsAlerts(parsed.smsAlerts ?? false);
      setCompactView(parsed.compactView ?? false);
      setLastSavedAt(parsed.savedAt ?? null);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey, user?.email]);

  const initials = useMemo(() => {
    const source = displayName.trim() || user?.email || 'User';
    return source
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [displayName, user?.email]);

  function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    const savedAt = new Date().toISOString();
    const payload: SavedSettings & { savedAt: string } = {
      displayName: displayName.trim(),
      phone: phone.trim(),
      emailUpdates,
      smsAlerts,
      compactView,
      savedAt,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    setDisplayName(payload.displayName);
    setPhone(payload.phone);
    setLastSavedAt(savedAt);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#0b5fa5] px-6 py-7 text-white">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-[#0b5fa5] shadow-lg">
                {initials || 'U'}
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/75">
                  Account settings
                </p>
                <h1 className="mt-2 text-3xl font-bold capitalize">
                  {displayName || 'Staff profile'}
                </h1>
                <p className="mt-1 text-sm text-white/80">{user?.email}</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/12 px-4 py-3 text-sm">
              <p className="font-bold capitalize">{formatRole(role)}</p>
              <p className="mt-1 text-white/75">
                Home: {dashboardRouteForRole(role).replace('/app/', '').replace(/\//g, ' / ')}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={savePreferences} className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#0b5fa5] shadow-sm">
                <UserCog className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Edit profile</h2>
                <p className="text-sm text-slate-600">
                  Keep your staff contact information current.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-[#0b5fa5] focus:ring-2"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Phone number</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-[#0b5fa5] focus:ring-2"
                  placeholder="+265 ..."
                />
              </label>
              <div className="sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Email address</span>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-[#0b5fa5]" />
                  {user?.email ?? 'No email available'}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#0b5fa5] shadow-sm">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Security</h2>
                <p className="text-sm text-slate-600">Review account safety and sign-in details.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Role-based access active
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Your workspace is determined by your staff account role.
                </p>
              </div>
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0b5fa5] hover:bg-[#eef7ff]"
              >
                Change password
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={emailUpdates}
                  onChange={(e) => setEmailUpdates(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#0b5fa5]"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Bell className="h-4 w-4 text-[#0b5fa5]" />
                    Email updates
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Receive assignment and system notices by email.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#0b5fa5]"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Phone className="h-4 w-4 text-[#0b5fa5]" />
                    SMS alerts
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Get urgent operational notifications by SMS.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={compactView}
                  onChange={(e) => setCompactView(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#0b5fa5]"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Moon className="h-4 w-4 text-[#0b5fa5]" />
                    Compact workspace
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Prefer denser tables and dashboard panels.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Globe2 className="h-4 w-4 text-[#0b5fa5]" />
                  Language and region
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  English · Malawi service timezone
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Clock className="h-4 w-4 text-[#0b5fa5]" />
                  Session preference
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Sign out from the sidebar when using shared machines.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b5fa5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#084f8b]"
              >
                <Save className="h-4 w-4" />
                Save settings
              </button>
              {saved && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Check className="h-4 w-4" />
                  Settings saved
                </span>
              )}
              {!saved && lastSavedAt && (
                <span className="text-sm text-slate-500">
                  Last saved {new Date(lastSavedAt).toLocaleString()}
                </span>
              )}
            </div>
          </section>
        </form>
      </section>
    </div>
  );
}
