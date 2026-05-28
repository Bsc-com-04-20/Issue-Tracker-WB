import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  MapPin,
  Paperclip,
  Phone,
  User,
  UserPlus,
} from 'lucide-react';
import { IssueProgressStrip } from '@/components/issue/IssueProgressStrip';
import { DepartmentHandlingCard } from '@/components/issue/DepartmentHandlingCard';
import { DuplicateMergeWorkflow } from '@/components/intake/DuplicateMergeWorkflow';
import { IntakeContactVerifyCard } from '@/components/intake/IntakeContactVerifyCard';
import { IntakeMentorPanel } from '@/components/intake/IntakeMentorPanel';
import { getCategoryTechnicianWorkflow } from '@/lib/categoryTechnicianWorkflow';
import {
  buildIntakeMentorSteps,
  categoryLabelPlain,
  statusLabelPlain,
} from '@/lib/intakeMentorSteps';
import { issueHasSupervisorRequest } from '@/lib/auth';
import { downloadAuthorizedFile } from '@/lib/download';
import { intakeDuplicateCandidateCount } from '@/lib/issueIntelligence';
import { issueKey } from '@/lib/issueKey';
import { statusPillClass } from '@/lib/statusUi';
import type {
  AttachmentDto,
  IssueDetail,
  StatusHistoryStep,
  SuggestedTechniciansResponse,
  TechnicianOption,
} from '@/lib/types';
import type { MentorStepId } from '@/lib/intakeMentorSteps';

export type IntakeIssueDetailViewProps = {
  issue: IssueDetail;
  issueId: number;
  onBack: () => void;
  actionMsg: string | null;
  busy: boolean;
  statusHistory: StatusHistoryStep[];
  attachments: AttachmentDto[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editPhone: string;
  setEditPhone: (v: string) => void;
  editAddr: string;
  setEditAddr: (v: string) => void;
  editLat: string;
  setEditLat: (v: string) => void;
  editLng: string;
  setEditLng: (v: string) => void;
  intelMsg: string | null;
  intelError: string | null;
  onSaveContact: () => void;
  onRefreshIntelligence: () => void;
  supervisorNote: string;
  setSupervisorNote: (v: string) => void;
  onRequestSupervisor: () => void;
  onMergedDuplicate: () => void;
  technicians: TechnicianOption[];
  pickTech: string;
  setPickTech: (v: string) => void;
  assignPri: string;
  setAssignPri: (v: string) => void;
  onSubmitAssign: () => void;
  suggestedTech: SuggestedTechniciansResponse | null;
  showAssign: boolean;
};

export function IntakeIssueDetailView({
  issue,
  issueId,
  onBack,
  actionMsg,
  busy,
  statusHistory,
  attachments,
  onUpload,
  editPhone,
  setEditPhone,
  editAddr,
  setEditAddr,
  editLat,
  setEditLat,
  editLng,
  setEditLng,
  intelMsg,
  intelError,
  onSaveContact,
  onRefreshIntelligence,
  supervisorNote,
  setSupervisorNote,
  onRequestSupervisor,
  onMergedDuplicate,
  technicians,
  pickTech,
  setPickTech,
  assignPri,
  setAssignPri,
  onSubmitAssign,
  suggestedTech,
  showAssign,
}: IntakeIssueDetailViewProps) {
  const st = issue.currentStatus.name;
  const mentorSteps = useMemo(
    () => buildIntakeMentorSteps(issue, st),
    [issue, st],
  );
  const dupCount = intakeDuplicateCandidateCount(issue.issueAttributes);
  const supervisorFlagged = issueHasSupervisorRequest(issue.issueAttributes);
  const [showDetails, setShowDetails] = useState(false);
  const canEditContact = st === 'reported' || st === 'assigned';

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to intake queue
      </button>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold text-indigo-700">
            {issueKey(issue.id)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusPillClass(st)}`}
          >
            {statusLabelPlain(st)}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {categoryLabelPlain(issue.issueCategory)}
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-900 ring-1 ring-amber-200">
            {issue.urgencyLevel} urgency
          </span>
        </div>
        <h1 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
          {issue.description}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Reported {format(new Date(issue.dateReported), 'MMM d, yyyy · h:mm a')}
          {issue.reportChannel ? ` · via ${issue.reportChannel}` : ''}
        </p>
        <div className="mt-4">
          <IssueProgressStrip
            currentStatus={st}
            history={statusHistory}
            reporterName={issue.reporterName}
            createdBy={issue.createdBy ?? null}
            issueCategory={issue.issueCategory}
          />
        </div>
      </header>

      {actionMsg ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {actionMsg}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <IntakeMentorPanel steps={mentorSteps}>
            {(stepId: MentorStepId) => {
              if (stepId === 'understand') {
                return (
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-700">{issue.description}</p>
                    {issue.location ? (
                      <p className="flex items-start gap-2 text-slate-600">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          {issue.location.addressDescription}
                          {issue.location.serviceArea
                            ? ` · ${issue.location.serviceArea}`
                            : ''}
                        </span>
                      </p>
                    ) : null}
                    {issue.departmentPlaybook ? (
                      <DepartmentHandlingCard
                        playbook={issue.departmentPlaybook}
                        issue={issue}
                        defaultExpanded={false}
                      />
                    ) : null}
                  </div>
                );
              }
              if (stepId === 'duplicates') {
                if (st !== 'reported') {
                  return (
                    <p className="text-sm text-slate-600">
                      Duplicate merge is only available while the ticket is still
                      waiting for intake.
                    </p>
                  );
                }
                return (
                  <div className="space-y-3">
                    {dupCount > 0 ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        <strong>{dupCount}</strong> other open ticket
                        {dupCount === 1 ? '' : 's'} may be the same problem. Open
                        each one — if it is the same incident, merge this ticket into
                        the older primary record.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600">
                        No strong duplicate matches right now. You can still merge
                        manually if you recognise a repeat caller.
                      </p>
                    )}
                    <DuplicateMergeWorkflow
                      duplicateIssueId={issueId}
                      onMerged={onMergedDuplicate}
                    />
                  </div>
                );
              }
              if (stepId === 'verify') {
                return (
                  <IntakeContactVerifyCard
                    editPhone={editPhone}
                    setEditPhone={setEditPhone}
                    editAddr={editAddr}
                    setEditAddr={setEditAddr}
                    editLat={editLat}
                    setEditLat={setEditLat}
                    editLng={editLng}
                    setEditLng={setEditLng}
                    busy={busy}
                    intelMsg={intelMsg}
                    intelError={intelError}
                    onSave={onSaveContact}
                    onRefresh={onRefreshIntelligence}
                    canEdit={canEditContact}
                  />
                );
              }
              if (stepId === 'dispatch') {
                if (!showAssign) {
                  return (
                    <p className="text-sm text-slate-600">
                      {st === 'closed' || st === 'resolved'
                        ? 'This ticket is no longer open for field dispatch.'
                        : 'Assignment is handled by another role for this status.'}
                    </p>
                  );
                }
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      {getCategoryTechnicianWorkflow(issue.issueCategory).lane ===
                      'billing'
                        ? 'Assign billing staff who will reconcile the account and payment records — not a field crew.'
                        : getCategoryTechnicianWorkflow(issue.issueCategory).lane ===
                            'field'
                          ? 'Choose who will visit or fix the problem. Priority defaults from urgency.'
                          : 'Assign staff for this category. They will use the matching desk or field workflow when updating status.'}
                    </p>
                    {issue.currentAssignment ? (
                      <p className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-sm text-indigo-950">
                        Currently assigned to{' '}
                        <strong>{issue.currentAssignment.technicianName}</strong>
                        <span className="block text-xs text-indigo-800/85">
                          {formatDistanceToNow(
                            new Date(issue.currentAssignment.assignmentDate),
                            { addSuffix: true },
                          )}
                        </span>
                      </p>
                    ) : null}
                    <select
                      value={pickTech}
                      onChange={(e) => setPickTech(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Select a technician…</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={assignPri}
                      onChange={(e) => setAssignPri(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="low">Dispatch priority: normal</option>
                      <option value="medium">Dispatch priority: medium</option>
                      <option value="high">Dispatch priority: high</option>
                    </select>
                    {suggestedTech && suggestedTech.ranked.length > 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-800">
                          Suggested order
                        </p>
                        <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
                          {suggestedTech.ranked.slice(0, 6).map((row) => (
                            <li key={row.id}>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-white"
                                onClick={() => setPickTech(String(row.id))}
                              >
                                <span className="font-medium text-slate-900">
                                  {row.name}
                                </span>
                                <span className="mt-0.5 block text-slate-500">
                                  {row.rankHint}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy || technicians.length === 0}
                      onClick={onSubmitAssign}
                      className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        {st === 'reported' ? 'Assign technician' : 'Reassign'}
                      </span>
                    </button>
                  </div>
                );
              }
              if (stepId === 'escalate') {
                return (
                  <div className="space-y-3">
                    {supervisorFlagged ? (
                      <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950">
                        This ticket is already flagged for supervisor review. You do
                        not need to send again unless the situation changed.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600">
                        Use this when you need a supervisor for policy, safety, or a
                        routing decision you cannot make at intake.
                      </p>
                    )}
                    <textarea
                      value={supervisorNote}
                      onChange={(e) => setSupervisorNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Short note for the supervisor (optional)…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={busy || supervisorFlagged}
                      onClick={onRequestSupervisor}
                      className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {supervisorFlagged ? 'Already flagged' : 'Send to supervisor'}
                    </button>
                  </div>
                );
              }
              return null;
            }}
          </IntakeMentorPanel>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800"
            >
              More details & attachments
              <span className="text-slate-400">{showDetails ? '−' : '+'}</span>
            </button>
            {showDetails ? (
              <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    Attachments ({attachments.length})
                  </h3>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                    <Paperclip className="h-4 w-4" />
                    Add file
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={onUpload}
                      disabled={busy}
                    />
                  </label>
                  {attachments.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No files yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {attachments.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                        >
                          <span className="truncate text-sm font-medium text-slate-800">
                            {a.originalName}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void downloadAuthorizedFile(
                                a.downloadPath,
                                a.originalName,
                              )
                            }
                            className="shrink-0 text-sm font-medium text-indigo-600 hover:underline"
                          >
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link
                  to="/app/dashboard/operations"
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  Open operations dashboard →
                </Link>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <User className="h-4 w-4 text-slate-400" />
              Customer
            </h2>
            <p className="mt-2 font-medium text-slate-900">{issue.reporterName}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-3.5 w-3.5" />
              {issue.reporterPhone || 'No phone on file'}
            </p>
            {issue.reporterEmail ? (
              <p className="mt-2 text-xs text-slate-500">{issue.reporterEmail}</p>
            ) : (
              <p className="mt-2 text-xs text-amber-800">
                No email — customer will not get automatic closure notices.
              </p>
            )}
            {issue.accountNumber ? (
              <p className="mt-2 text-xs text-slate-500">
                Account / meter: {issue.accountNumber}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-800">Quick tips</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Merge only when it is the same incident, not just the same address.</li>
              <li>Assign after phone and location look correct.</li>
              <li>Supervisor is for decisions you cannot make alone.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
