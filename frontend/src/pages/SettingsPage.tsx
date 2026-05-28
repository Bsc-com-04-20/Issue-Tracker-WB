import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CheckCircle,
  Map,
  Save,
  Scale,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, parseJson } from '@/lib/api';

type SettingsTab = {
  id: 'profile' | 'ops' | 'security' | 'areas';
  label: string;
  icon: LucideIcon;
  roles: string[];
};

type DistrictRow = {
  number: number;
  name: string;
  code: string;
};

const tabs: SettingsTab[] = [
  { id: 'profile', label: 'Profile', icon: Settings, roles: ['*'] },
  { id: 'ops', label: 'Operational Logic', icon: Scale, roles: ['admin', 'supervisor'] },
  { id: 'security', label: 'Security & Auth', icon: Shield, roles: ['admin'] },
  { id: 'areas', label: 'Service Areas', icon: Map, roles: ['admin', 'supervisor'] },
];

const canUseTab = (roles: string[], role: string) =>
  roles.includes('*') || roles.includes(role);

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const availableTabs = useMemo(
    () => tabs.filter((tab) => canUseTab(tab.roles, role)),
    [role],
  );
  const [activeTab, setActiveTab] = useState<SettingsTab['id']>('profile');

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('profile');
    }
  }, [activeTab, availableTabs]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Settings</h1>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-64 lg:flex-col">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'ops' && canUseTab(['admin', 'supervisor'], role) && (
            <OperationalSettings />
          )}
          {activeTab === 'security' && role === 'admin' && <SecuritySettings />}
          {activeTab === 'areas' && canUseTab(['admin', 'supervisor'], role) && (
            <AreaSettings />
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState({ language: 'en', notifyEmail: true });

  const handleSave = async () => {
    setIsSaving(true);
    await delay(600);
    setIsSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Personal Preferences"
        description="Manage your UI experience and notifications."
      >
        <SaveButton
          isSaving={isSaving}
          saved={saved}
          savingLabel="Saving..."
          savedLabel="Saved"
          label="Save Changes"
          onClick={handleSave}
        />
      </SettingsHeader>

      <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Email</dt>
          <dd className="text-slate-900">{user?.email ?? 'Unknown'}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Role</dt>
          <dd className="capitalize text-slate-900">{user?.role ?? 'Unknown'}</dd>
        </div>
      </dl>

      <div className="space-y-4">
        <SettingItem label="Language" description="Choose system display language">
          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={prefs.language}
            onChange={(event) =>
              setPrefs({ ...prefs, language: event.target.value })
            }
          >
            <option value="en">English</option>
            <option value="ny">Chichewa</option>
          </select>
        </SettingItem>

        <SettingItem
          label="Email Notifications"
          description="Receive status updates via email"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded text-indigo-600"
            checked={prefs.notifyEmail}
            onChange={(event) =>
              setPrefs({ ...prefs, notifyEmail: event.target.checked })
            }
          />
        </SettingItem>
      </div>
    </div>
  );
}

function OperationalSettings() {
  const [config, setConfig] = useState({ sla: 4, weight: 40 });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await delay(800);
    setIsSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Triage & Priority Weights"
        description="Adjust the scoring logic for the water supply priority engine."
      />

      <div className="space-y-4">
        <SettingItem
          label="SLA: Critical (Hours)"
          description="Goal for resolving critical health issues"
        >
          <input
            type="number"
            className="w-20 rounded-md border px-2 py-1 text-sm"
            value={config.sla}
            onChange={(event) =>
              setConfig({
                ...config,
                sla: Number.parseInt(event.target.value, 10) || 0,
              })
            }
          />
        </SettingItem>

        <SettingItem
          label="Clinic/Hospital Weight"
          description="Priority boost for medical premises"
        >
          <input
            type="number"
            className="w-20 rounded-md border px-2 py-1 text-sm"
            value={config.weight}
            onChange={(event) =>
              setConfig({
                ...config,
                weight: Number.parseInt(event.target.value, 10) || 0,
              })
            }
          />
        </SettingItem>
      </div>

      <SaveButton
        isSaving={isSaving}
        saved={saved}
        savingLabel="Updating..."
        savedLabel="Saved"
        label="Save Operational Rules"
        onClick={handleSave}
      />
    </div>
  );
}

function SecuritySettings() {
  const [security, setSecurity] = useState({ otpTtl: 5, maxAttempts: 5 });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await delay(800);
    setIsSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Security Policies"
        description="Global security and verification thresholds."
      />

      <div className="space-y-4">
        <SettingItem
          label="OTP Expiry (Minutes)"
          description="How long the SMS code remains valid"
        >
          <input
            type="number"
            className="w-20 rounded-md border px-2 py-1 text-sm"
            value={security.otpTtl}
            onChange={(event) =>
              setSecurity({
                ...security,
                otpTtl: Number.parseInt(event.target.value, 10) || 0,
              })
            }
          />
        </SettingItem>

        <SettingItem
          label="Max Login Attempts"
          description="Attempts before account lockout"
        >
          <input
            type="number"
            className="w-20 rounded-md border px-2 py-1 text-sm"
            value={security.maxAttempts}
            onChange={(event) =>
              setSecurity({
                ...security,
                maxAttempts: Number.parseInt(event.target.value, 10) || 0,
              })
            }
          />
        </SettingItem>
      </div>

      <SaveButton
        isSaving={isSaving}
        saved={saved}
        savingLabel="Updating..."
        savedLabel="Policy Updated"
        label="Update Security Policy"
        onClick={handleSave}
        variant="dark"
      />
    </div>
  );
}

function AreaSettings() {
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDistricts() {
      try {
        const response = await apiFetch('/issue/public/districts');
        if (!response.ok) throw new Error('Unable to load service areas');
        const data = await parseJson<DistrictRow[]>(response);
        if (!cancelled) setDistricts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load service areas');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadDistricts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Service Areas"
        description="Active operational districts and supply zones."
      />

      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-200">
        {isLoading && (
          <div className="p-4 text-sm text-slate-500">Loading service areas...</div>
        )}

        {!isLoading && error && (
          <div className="p-4 text-sm text-red-600">{error}</div>
        )}

        {!isLoading &&
          !error &&
          districts.map((district) => (
            <div
              key={district.code}
              className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0 hover:bg-slate-50"
            >
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {district.name}
                </div>
                <div className="text-xs text-slate-500">
                  District {district.number}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-2 py-1 text-[10px] font-bold uppercase text-green-700">
                  Active
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Edit Zones
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function SettingsHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-medium text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SaveButton({
  isSaving,
  saved,
  savingLabel,
  savedLabel,
  label,
  onClick,
  variant = 'primary',
}: {
  isSaving: boolean;
  saved: boolean;
  savingLabel: string;
  savedLabel: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'dark';
}) {
  const color =
    variant === 'dark'
      ? 'bg-slate-900 hover:bg-slate-800'
      : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSaving}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${color}`}
    >
      {isSaving ? (
        savingLabel
      ) : saved ? (
        <>
          <CheckCircle className="h-4 w-4" />
          {savedLabel}
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

function SettingItem({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      {children}
    </div>
  );
}
