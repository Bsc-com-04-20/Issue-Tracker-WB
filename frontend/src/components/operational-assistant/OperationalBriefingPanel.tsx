import {
  AlertTriangle,
  Brain,
  Lock,
  Radio,
  Route,
  Shield,
  Sparkles,
} from 'lucide-react';
import type {
  CategoryRedirect,
  OperationalAlert,
  OperationalBriefing,
} from '@/lib/operational-assistant/conversation-engine';

const TONE_STYLES: Record<
  OperationalAlert['tone'],
  { border: string; bg: string; text: string; icon: typeof AlertTriangle }
> = {
  info: {
    border: 'border-sky-200',
    bg: 'bg-sky-50/90',
    text: 'text-sky-950',
    icon: Route,
  },
  caution: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/90',
    text: 'text-amber-950',
    icon: AlertTriangle,
  },
  urgent: {
    border: 'border-rose-200',
    bg: 'bg-rose-50/90',
    text: 'text-rose-950',
    icon: AlertTriangle,
  },
  confidential: {
    border: 'border-violet-300',
    bg: 'bg-violet-50/90',
    text: 'text-violet-950',
    icon: Lock,
  },
};

type Props = {
  briefing: OperationalBriefing;
  severity: string;
  urgency: string;
  scope: string;
  triageReason: string;
  onApplyRedirect?: (redirect: CategoryRedirect) => void;
};

export function OperationalBriefingPanel({
  briefing,
  severity,
  urgency,
  scope,
  triageReason,
  onApplyRedirect,
}: Props) {
  const tierAccent =
    briefing.escalationTier === 'critical_health' ||
    briefing.escalationTier === 'emergency'
      ? 'from-rose-500/10 to-orange-50'
      : briefing.escalationTier === 'urgent'
        ? 'from-amber-500/10 to-amber-50'
        : 'from-indigo-500/10 to-cyan-50';

  return (
    <div className="mt-3 space-y-2">
      <div
        className={`rounded-xl border border-slate-200/80 bg-gradient-to-r ${tierAccent} px-3 py-2.5 text-xs`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-semibold text-slate-800 ring-1 ring-slate-200">
            <Radio className="h-3 w-3 text-indigo-600" />
            {briefing.phaseLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-medium text-slate-700 ring-1 ring-slate-200">
            <Shield className="h-3 w-3 text-emerald-600" />
            {briefing.escalationLabel}
          </span>
        </div>
        <p className="mt-2 leading-relaxed text-slate-800">{briefing.operationalSummary}</p>
        <p className="mt-1 text-slate-600">
          <span className="font-medium text-slate-800">Dispatch lane:</span>{' '}
          {briefing.dispatchLane}
        </p>
      </div>

      <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs text-violet-950">
        <p className="flex items-center gap-1 font-semibold text-violet-900">
          <Sparkles className="h-3.5 w-3.5" />
          Severity engine
        </p>
        <p className="mt-1">
          Severity <span className="font-semibold">{severity}</span> · Urgency{' '}
          <span className="font-semibold">{urgency}</span> · Scope{' '}
          <span className="font-semibold">{scope}</span>
        </p>
        <p className="mt-1 text-violet-900/80">{triageReason}</p>
      </div>

      {briefing.workflowActions.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-950">
          <p className="font-semibold text-indigo-900">Operational actions</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {briefing.workflowActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {briefing.alerts.slice(0, 4).map((alert) => (
        <OperationalAlertCard key={alert.id} alert={alert} />
      ))}

      {briefing.redirects.length > 0 && onApplyRedirect && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <p className="font-semibold text-amber-900">Contextual redirect</p>
          {briefing.redirects.map((r) => (
            <div key={`${r.toCategory}-${r.toSubcategory}`} className="mt-2">
              <p className="text-amber-900/90">{r.reason}</p>
              <button
                type="button"
                onClick={() => onApplyRedirect(r)}
                className="mt-1.5 rounded-md bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Switch to {r.toSubcategory.replace(/_/g, ' ')}
              </button>
            </div>
          ))}
        </div>
      )}

      {briefing.aiAssistNote && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p className="flex items-center gap-1 font-semibold text-slate-800">
            <Brain className="h-3.5 w-3.5" />
            AI-assisted intake (planned)
          </p>
          <p className="mt-1">{briefing.aiAssistNote}</p>
        </div>
      )}
    </div>
  );
}

function OperationalAlertCard({ alert }: { alert: OperationalAlert }) {
  const style = TONE_STYLES[alert.tone];
  const Icon = style.icon;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${style.border} ${style.bg} ${style.text}`}>
      <p className="flex items-center gap-1 font-semibold">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {alert.title}
      </p>
      <p className="mt-1 leading-relaxed opacity-90">{alert.body}</p>
    </div>
  );
}
