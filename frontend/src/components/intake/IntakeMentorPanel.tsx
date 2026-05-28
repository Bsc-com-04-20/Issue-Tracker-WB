import { useState, type ReactNode } from 'react';
import { CheckCircle2, Circle, CircleDot, ChevronDown, Lightbulb } from 'lucide-react';
import type { MentorStep, MentorStepId } from '@/lib/intakeMentorSteps';

type Props = {
  steps: MentorStep[];
  children: (stepId: MentorStepId) => ReactNode;
};

export function IntakeMentorPanel({ steps, children }: Props) {
  const defaultOpen = steps.find((s) => s.defaultOpen)?.id ?? steps[0]?.id;
  const [openId, setOpenId] = useState<MentorStepId | null>(defaultOpen ?? null);

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-indigo-100 px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Lightbulb className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-bold text-indigo-950">Intake guide</h2>
          <p className="mt-0.5 text-sm text-indigo-900/80">
            Work through these steps in order. Tap a step to open actions and tips.
          </p>
        </div>
      </header>

      <ol className="divide-y divide-indigo-100/80">
        {steps.map((step, index) => {
          const open = openId === step.id;
          const Icon =
            step.state === 'done'
              ? CheckCircle2
              : step.state === 'current'
                ? CircleDot
                : Circle;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : step.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-indigo-50/60 sm:px-5"
                aria-expanded={open}
              >
                <span className="mt-0.5 flex flex-col items-center gap-1">
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      step.state === 'done'
                        ? 'text-emerald-600'
                        : step.state === 'current'
                          ? 'text-indigo-600'
                          : 'text-slate-300'
                    }`}
                    aria-hidden
                  />
                  {index < steps.length - 1 ? (
                    <span className="hidden h-6 w-px bg-indigo-200 sm:block" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {index + 1}. {step.title}
                    </span>
                    {step.state === 'optional' ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                        Optional
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600">{step.hint}</span>
                </span>
                <ChevronDown
                  className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    open ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {open ? (
                <div className="border-t border-indigo-100/80 bg-white/70 px-4 pb-4 pt-3 sm:px-5">
                  {children(step.id)}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
