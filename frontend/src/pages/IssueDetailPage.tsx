import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Loader2,
  MoreVertical,
  Paperclip,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, parseJson } from '@/lib/api';
import { readApiErrorMessage } from '@/lib/apiError';
import { intakeDuplicateCandidateCount } from '@/lib/issueIntelligence';
import {
  canAcknowledgeSupervisorEscalation,
  canAssignIssue,
  canCloseIssue,
  canMergeDuplicatesOnIssue,
  canRefreshIntelligenceAndReporterContact,
  canUseIntakeIssueTools,
  canViewAudit,
  expandDepartmentPlaybookByDefault,
  issueHasSupervisorRequest,
  issueSupervisorEscalationAcknowledged,
  isDepartmentSpecialistRole,
  isIntakeOfficerRole,
  isTechnician,
} from '@/lib/auth';
import { IssueProgressStrip } from '@/components/issue/IssueProgressStrip';
import { BillingResolutionSummary } from '@/components/issue/BillingResolutionSummary';
import { TechnicianIssueActions } from '@/components/issue/TechnicianIssueActions';
import {
  applyBillingContextToForm,
  billingFormToPayload,
  defaultBillingResolutionForm,
  readBillingResolutionFromIssue,
  validateBillingResolutionForm,
  isBillingResolutionAttributeKey,
  type BillingResolutionContextDto,
  type BillingResolutionFormState,
} from '@/lib/billingResolution';
import { DepartmentHandlingCard } from '@/components/issue/DepartmentHandlingCard';
import {
  getCategoryTechnicianWorkflow,
  workProgressLabel,
} from '@/lib/categoryTechnicianWorkflow';
import { DuplicateMergeWorkflow } from '@/components/intake/DuplicateMergeWorkflow';
import { IntakeIssueDetailView } from '@/components/intake/IntakeIssueDetailView';
import { downloadAuthorizedFile } from '@/lib/download';
import { issueKey, parseIssueKeyParam } from '@/lib/issueKey';
import { priorityUi, statusPillClass } from '@/lib/statusUi';
import type {
  AttachmentDto,
  AuditEntry,
  IssueDetail,
  StatusHistoryStep,
  SuggestedTechniciansResponse,
  TechnicianOption,
} from '@/lib/types';
import {
  assignmentPriorityFromUrgency,
  normalizeAssignmentPriority,
} from '@/lib/dispatch-priority';

export function IssueDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? '';

  const issueId = idParam ? parseIssueKeyParam(idParam) : null;

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const [resolutionText, setResolutionText] = useState('');
  const [billingForm, setBillingForm] = useState<BillingResolutionFormState | null>(
    null,
  );
  const [billingValidationError, setBillingValidationError] = useState<
    string | null
  >(null);
  const [billingContext, setBillingContext] =
    useState<BillingResolutionContextDto | null>(null);
  const [billingContextLoading, setBillingContextLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [pickTech, setPickTech] = useState('');
  const [assignPri, setAssignPri] = useState('medium');
  const [issueAudit, setIssueAudit] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [supervisorNote, setSupervisorNote] = useState('');
  const [dupPanelOpen, setDupPanelOpen] = useState(false);
  const [dupStandaloneOpen, setDupStandaloneOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryStep[]>([]);
  const [suggestedTech, setSuggestedTech] =
    useState<SuggestedTechniciansResponse | null>(null);
  const [fieldProgressPick, setFieldProgressPick] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editAddr, setEditAddr] = useState('');
  const [intelMsg, setIntelMsg] = useState<string | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);

  const pullIssueSnapshot = useCallback(async () => {
    if (issueId == null) return;
    const [ir, hr] = await Promise.all([
      apiFetch(`/issue/${issueId}`),
      apiFetch(`/issue/${issueId}/status-history`),
    ]);
    if (ir.ok) setIssue(await parseJson<IssueDetail>(ir));
    if (hr.ok) {
      const h = await parseJson<StatusHistoryStep[]>(hr);
      setStatusHistory(Array.isArray(h) ? h : []);
    } else {
      setStatusHistory([]);
    }
  }, [issueId]);

  useEffect(() => {
    if (issueId == null) {
      setError('Invalid issue id');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ir, ar, hr] = await Promise.all([
          apiFetch(`/issue/${issueId}`),
          apiFetch(`/issue/${issueId}/attachments`),
          apiFetch(`/issue/${issueId}/status-history`),
        ]);
        if (cancelled) return;
        if (!ir.ok) {
          setError(ir.status === 403 ? 'Access denied' : 'Issue not found');
          setIssue(null);
          setStatusHistory([]);
          return;
        }
        setIssue(await parseJson<IssueDetail>(ir));
        if (hr.ok) {
          const h = await parseJson<StatusHistoryStep[]>(hr);
          setStatusHistory(Array.isArray(h) ? h : []);
        } else {
          setStatusHistory([]);
        }
        if (ar.ok) {
          setAttachments(await parseJson<AttachmentDto[]>(ar));
        } else {
          setAttachments([]);
        }
      } catch {
        if (!cancelled) setError('Failed to load issue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [issueId]);

  useEffect(() => {
    if (!canAssignIssue(role) || issueId == null) return;
    let cancelled = false;
    (async () => {
      const res = await apiFetch('/user/technicians');
      if (cancelled || !res.ok) return;
      const data = await parseJson<TechnicianOption[]>(res);
      if (Array.isArray(data)) setTechnicians(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, issueId]);

  useEffect(() => {
    if (!canAssignIssue(role) || issueId == null) {
      setSuggestedTech(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await apiFetch(`/issue/${issueId}/suggested-technicians`);
      if (cancelled) return;
      if (!res.ok) {
        setSuggestedTech(null);
        return;
      }
      const data = await parseJson<SuggestedTechniciansResponse>(res);
      setSuggestedTech(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, issueId]);

  useEffect(() => {
    if (!issue) return;
    setEditPhone(issue.reporterPhone ?? '');
    setEditLat(
      issue.location != null ? String(issue.location.latitude) : '',
    );
    setEditLng(
      issue.location != null ? String(issue.location.longitude) : '',
    );
    setEditAddr(issue.location?.addressDescription ?? '');
  }, [issue]);

  useEffect(() => {
    const cur = issue?.issueAttributes?.field_progress;
    setFieldProgressPick(typeof cur === 'string' ? cur : '');
  }, [issue?.issueAttributes?.field_progress]);

  const loadBillingContext = useCallback(async () => {
    if (issueId == null || issue?.issueCategory !== 'billing_account') return;
    setBillingContextLoading(true);
    try {
      const res = await apiFetch(
        `/issue/${issueId}/billing-resolution-context`,
      );
      if (!res.ok) {
        const msg = await readApiErrorMessage(
          res,
          'Could not load billing account data',
        );
        setBillingValidationError(msg);
        setBillingContext(null);
        return;
      }
      const ctx = await parseJson<BillingResolutionContextDto>(res);
      setBillingContext(ctx);
      setBillingValidationError(null);
      setBillingForm((prev) =>
        applyBillingContextToForm(
          ctx,
          issue!,
          prev ?? defaultBillingResolutionForm(issue!),
        ),
      );
    } catch {
      setBillingValidationError('Could not load billing account data');
      setBillingContext(null);
    } finally {
      setBillingContextLoading(false);
    }
  }, [issueId, issue]);

  useEffect(() => {
    if (!issue) return;
    if (issue.issueCategory === 'billing_account') {
      setBillingForm(defaultBillingResolutionForm(issue));
      setBillingValidationError(null);
      setBillingContext(null);
    } else {
      setBillingForm(null);
      setBillingContext(null);
      setBillingValidationError(null);
    }
  }, [issue?.id, issue?.issueCategory]);

  useEffect(() => {
    if (
      isTechnician(role) &&
      issue?.issueCategory === 'billing_account' &&
      issue.currentStatus.name === 'in_progress'
    ) {
      void loadBillingContext();
    }
  }, [
    role,
    issue?.issueCategory,
    issue?.currentStatus.name,
    issue?.id,
    loadBillingContext,
  ]);

  useEffect(() => {
    if (tab !== 'history' || !canViewAudit(role) || issueId == null) {
      setIssueAudit([]);
      return;
    }
    let cancelled = false;
    setAuditLoading(true);
    (async () => {
      try {
        const res = await apiFetch('/audit?skip=0&take=200');
        if (cancelled || !res.ok) return;
        const data = await parseJson<{ items: AuditEntry[] }>(res);
        const rows = (data.items ?? []).filter(
          (x) => x.entityName === 'Issue' && x.entityId === issueId,
        );
        setIssueAudit(rows);
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, role, issueId]);

  useEffect(() => {
    if (!issue) return;
    const ticketStatus = issue.currentStatus.name;
    if (issue.currentAssignment?.priorityLevel) {
      setAssignPri(
        normalizeAssignmentPriority(issue.currentAssignment.priorityLevel),
      );
    } else {
      setAssignPri(assignmentPriorityFromUrgency(issue.urgencyLevel));
    }
    if (ticketStatus === 'assigned' && issue.currentAssignment?.technicianId) {
      setPickTech(String(issue.currentAssignment.technicianId));
    } else if (ticketStatus === 'reported') {
      setPickTech('');
    }
  }, [
    issue?.id,
    issue?.urgencyLevel,
    issue?.currentAssignment?.priorityLevel,
    issue?.currentAssignment?.technicianId,
    issue?.currentStatus?.name,
  ]);

  async function refreshAttachments() {
    if (issueId == null) return;
    const ar = await apiFetch(`/issue/${issueId}/attachments`);
    if (ar.ok) setAttachments(await parseJson<AttachmentDto[]>(ar));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || issueId == null) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(`/issue/${issueId}/attachments`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Upload failed');
      }
      setActionMsg('File uploaded');
      await refreshAttachments();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(
    status: 'in_progress' | 'resolved',
  ) {
    if (issueId == null) return;
    setBusy(true);
    setActionMsg(null);
    setBillingValidationError(null);
    try {
      const body: {
        status: string;
        resolutionDetails?: string;
        billingResolution?: ReturnType<typeof billingFormToPayload>;
      } = { status };
      if (status === 'resolved') {
        if (issue?.issueCategory === 'billing_account') {
          setActionMsg('Use the billing resolution form to complete this ticket.');
          setBusy(false);
          return;
        }
        if (!resolutionText.trim()) {
          setActionMsg('Resolution details are required to resolve.');
          setBusy(false);
          return;
        }
        body.resolutionDetails = resolutionText.trim();
      }
      const res = await apiFetch(`/issue/${issueId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await readApiErrorMessage(res, 'Update failed');
        throw new Error(msg);
      }
      setActionMsg('Status updated');
      await pullIssueSnapshot();
      setResolutionText('');
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitBillingResolution() {
    if (issueId == null || !issue) return;
    const form =
      billingForm ??
      (issue.issueCategory === 'billing_account'
        ? defaultBillingResolutionForm(issue)
        : null);
    if (!form) return;
    const err = validateBillingResolutionForm(form, issue, billingContext);
    if (err) {
      setBillingValidationError(err);
      return;
    }
    setBillingValidationError(null);
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`/issue/${issueId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          billingResolution: billingFormToPayload(form),
        }),
      });
      if (!res.ok) {
        const msg = await readApiErrorMessage(res, 'Billing resolution failed');
        throw new Error(msg);
      }
      const data = await parseJson<IssueDetail>(res);
      const n = data.billingCustomerNotification;
      if (n?.channel === 'system_sms') {
        const parts: string[] = ['Billing resolution recorded.'];
        if (n.smsSent) parts.push('SMS sent.');
        else parts.push('SMS not sent.');
        if (n.emailSent) parts.push('Email sent.');
        if (n.detail) parts.push(n.detail);
        setActionMsg(parts.join(' '));
      } else if (n) {
        setActionMsg(
          `Billing resolution recorded. ${n.detail || 'Contact logged — no automated message.'}`,
        );
      } else {
        setActionMsg('Billing resolution recorded');
      }
      await pullIssueSnapshot();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Billing resolution failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitAssign() {
    if (issueId == null) return;
    const uid = Number(pickTech);
    if (!Number.isFinite(uid)) {
      setActionMsg('Select a technician to assign.');
      return;
    }
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch('/assignment', {
        method: 'POST',
        body: JSON.stringify({
          issueId,
          assignedToUserId: uid,
          priorityLevel: assignPri,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() ||
            'Assignment failed',
        );
      }
      setActionMsg('Issue assigned. Status is now assigned.');
      setPickTech('');
      await pullIssueSnapshot();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setBusy(false);
    }
  }

  async function closeIssue() {
    if (issueId == null) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`/issue/${issueId}/close`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Could not close issue');
      setActionMsg(
        'Issue closed. The reporter receives a closure email when their address is on the issue and SMTP is configured.',
      );
      await pullIssueSnapshot();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Close failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveFieldProgress() {
    if (issueId == null) return;
    const v = fieldProgressPick.trim();
    if (!v) {
      setActionMsg('Pick a field status from the list.');
      return;
    }
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`/issue/${issueId}/field-progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldProgress: v }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() ||
            'Update failed',
        );
      }
      setActionMsg('Work progress updated');
      await pullIssueSnapshot();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function requestSupervisor() {
    if (issueId == null) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`/issue/${issueId}/request-supervisor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: supervisorNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() ||
            'Request failed',
        );
      }
      setActionMsg('Supervisor has been flagged for this issue.');
      setSupervisorNote('');
      await pullIssueSnapshot();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function acknowledgeSupervisorEscalation() {
    if (issueId == null) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(
        `/issue/${issueId}/acknowledge-supervisor-escalation`,
        { method: 'POST' },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { message?: string | string[] }).message?.toString() ||
            'Request failed',
        );
      }
      setActionMsg('Escalation marked as handled.');
      await pullIssueSnapshot();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  function describeIntelligenceRefresh(updated: IssueDetail): string {
    const summary = updated.intakeIntelligence;
    if (summary?.duplicateSkippedReason === 'reporter_phone_and_map_location_required') {
      return 'Saved, but duplicate scoring needs both a reporter phone and map coordinates on this ticket.';
    }
    if (summary?.duplicateSkippedReason === 'duplicate_scan_failed') {
      return 'Saved, but the duplicate scan could not complete — try again in a moment.';
    }
    const n =
      summary?.duplicateCandidateCount ??
      intakeDuplicateCandidateCount(updated.issueAttributes);
    if (n > 0) {
      return `Re-scored: ${n} possible duplicate${n === 1 ? '' : 's'} flagged by the system.`;
    }
    return 'Re-scored: no strong duplicate matches in the last 30 days.';
  }

  function applyIntelligenceResponse(updated: IssueDetail, okMessage: string) {
    setIssue(updated);
    setIntelError(null);
    setIntelMsg(`${okMessage} ${describeIntelligenceRefresh(updated)}`);
    setActionMsg(null);
  }

  async function refreshIntelligence() {
    if (issueId == null) return;
    setBusy(true);
    setIntelError(null);
    setIntelMsg(null);
    try {
      const res = await apiFetch(`/issue/${issueId}/refresh-intelligence`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(
          await readApiErrorMessage(res, 'Could not refresh duplicate hints'),
        );
      }
      const updated = await parseJson<IssueDetail>(res);
      applyIntelligenceResponse(updated, 'Hints refreshed.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refresh failed';
      setIntelError(msg);
      setIntelMsg(null);
    } finally {
      setBusy(false);
    }
  }

  async function saveReporterContext() {
    if (issueId == null || !issue) return;
    setBusy(true);
    setIntelError(null);
    setIntelMsg(null);
    try {
      const body: Record<string, string | number> = {};
      if (editPhone.trim() !== (issue.reporterPhone ?? '').trim()) {
        body.reporterPhone = editPhone.trim();
      }
      const latN = Number.parseFloat(editLat.trim());
      const lngN = Number.parseFloat(editLng.trim());
      const latOk =
        editLat.trim() !== '' && Number.isFinite(latN) && !Number.isNaN(latN);
      const lngOk =
        editLng.trim() !== '' && Number.isFinite(lngN) && !Number.isNaN(lngN);
      if (latOk !== lngOk) {
        setIntelError(
          'Enter both latitude and longitude, or leave both unchanged.',
        );
        setBusy(false);
        return;
      }
      if (latOk && lngOk) {
        const prevLat = issue.location
          ? Number(issue.location.latitude)
          : Number.NaN;
        const prevLng = issue.location
          ? Number(issue.location.longitude)
          : Number.NaN;
        if (Math.abs(prevLat - latN) > 1e-9 || Math.abs(prevLng - lngN) > 1e-9) {
          body.latitude = latN;
          body.longitude = lngN;
        }
      }
      if (
        issue.location &&
        editAddr.trim() !== (issue.location.addressDescription ?? '').trim()
      ) {
        body.addressDescription = editAddr.trim();
      }
      if (Object.keys(body).length === 0) {
        await refreshIntelligence();
        return;
      }
      const res = await apiFetch(`/issue/${issueId}/reporter-context`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(
          await readApiErrorMessage(res, 'Could not update reporter details'),
        );
      }
      const updated = await parseJson<IssueDetail>(res);
      applyIntelligenceResponse(updated, 'Reporter details saved.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setIntelError(msg);
      setIntelMsg(null);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-700">{error ?? 'Not found'}</p>
        <Link
          to="/app/issues"
          className="mt-4 inline-block text-indigo-600 hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  const pr = priorityUi(issue.severityLevel);
  const st = issue.currentStatus.name;
  const categoryWorkflow = getCategoryTechnicianWorkflow(issue.issueCategory);
  const billingResolutionRecord = readBillingResolutionFromIssue(issue);
  const reportedTxId =
    issue.issueAttributes?.transactionId != null
      ? String(issue.issueAttributes.transactionId)
      : null;
  const tech = isTechnician(role);
  const canClose = canCloseIssue(role);
  const assigner = canAssignIssue(role);
  const intakeTools = canUseIntakeIssueTools(role);
  const intakeOnlyView = isIntakeOfficerRole(role);
  const deptSpecialist = isDepartmentSpecialistRole(role);
  const showAssign =
    assigner && (st === 'reported' || st === 'assigned');
  const supervisorFlagged = issueHasSupervisorRequest(issue.issueAttributes);
  const escalAck = issueSupervisorEscalationAcknowledged(issue.issueAttributes);
  const ackCaps = canAcknowledgeSupervisorEscalation(role);
  const mergeStandalone = canMergeDuplicatesOnIssue(role) && !intakeTools;
  const slaBreached = Boolean(issue.slaBreachedAt);
  const resDue = issue.slaResolutionDueAt
    ? new Date(issue.slaResolutionDueAt)
    : null;
  const firstDue = issue.slaFirstResponseDueAt
    ? new Date(issue.slaFirstResponseDueAt)
    : null;
  const hasSlaTargets =
    Boolean(issue.slaFirstResponseDueAt) || Boolean(issue.slaResolutionDueAt);

  if (intakeOnlyView) {
    return (
      <IntakeIssueDetailView
        issue={issue}
        issueId={issueId!}
        onBack={() => navigate('/app/issues?status=reported')}
        actionMsg={actionMsg}
        busy={busy}
        statusHistory={statusHistory}
        attachments={attachments}
        onUpload={onUpload}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editAddr={editAddr}
        setEditAddr={setEditAddr}
        editLat={editLat}
        setEditLat={setEditLat}
        editLng={editLng}
        setEditLng={setEditLng}
        intelMsg={intelMsg}
        intelError={intelError}
        onSaveContact={() => void saveReporterContext()}
        onRefreshIntelligence={() => void refreshIntelligence()}
        supervisorNote={supervisorNote}
        setSupervisorNote={setSupervisorNote}
        onRequestSupervisor={() => void requestSupervisor()}
        onMergedDuplicate={() => {
          setActionMsg('Duplicate merged. This record is now closed.');
          void pullIssueSnapshot();
        }}
        technicians={technicians}
        pickTech={pickTech}
        setPickTech={setPickTech}
        assignPri={assignPri}
        setAssignPri={setAssignPri}
        onSubmitAssign={() => void submitAssign()}
        suggestedTech={suggestedTech}
        showAssign={showAssign}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
            <span className="text-slate-400">/</span>
            <span className="text-slate-600">{issueKey(issue.id)}</span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusPillClass(
                st,
              )}`}
            >
              {st.replace(/_/g, ' ')}
            </span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${pr.className} border-current`}
            >
              {issue.severityLevel} priority
            </span>
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-800">
              {issue.urgencyLevel}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {issueKey(issue.id)}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
            {issue.description.slice(0, 200)}
            {issue.description.length > 200 ? '…' : ''}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Opened {format(new Date(issue.dateReported), 'MMM d, yyyy')} ·
            Reporter {issue.reporterName}
          </p>
        </div>
        <div className="flex items-start gap-2">
          {canClose && st === 'resolved' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void closeIssue()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              Close issue
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="More"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {actionMsg}
        </div>
      )}

      {canClose && st === 'resolved' && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Awaiting closure</p>
          <p className="mt-1 text-amber-900/90">
            {categoryWorkflow.awaitingClosureBlurb} Closing sends an email to the
            reporter when their address is stored on this issue.
          </p>
        </div>
      )}

      <div className="mb-6">
        <IssueProgressStrip
          currentStatus={st}
          history={statusHistory}
          reporterName={issue.reporterName}
          createdBy={issue.createdBy ?? null}
          issueCategory={issue.issueCategory}
        />
      </div>

      {issue.departmentPlaybook && (
        <DepartmentHandlingCard
          playbook={issue.departmentPlaybook}
          issue={issue}
          defaultExpanded={expandDepartmentPlaybookByDefault(role)}
        />
      )}

      {st === 'reported' &&
        issue.issueAttributes &&
        Number(issue.issueAttributes.intake_duplicate_candidate_count) > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">System duplicate check</p>
            <p className="mt-1 text-amber-900/90">
              {String(issue.issueAttributes.intake_duplicate_candidate_count)} open
              complaint(s) scored above the intake threshold (phone match, map distance,
              category, and reporting time). Review hints below or merge if it is the
              same incident.
            </p>
          </div>
        )}

      {canRefreshIntelligenceAndReporterContact(role) &&
        (st === 'reported' || st === 'assigned') && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Verification &amp; duplicate intelligence
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Correct the reporter phone or map pin if intake verification found an
              error; the system re-runs duplicate scoring and co-unit hints automatically.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600">
                Reporter phone
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Address (free text)
                <input
                  value={editAddr}
                  onChange={(e) => setEditAddr(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Latitude
                <input
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Longitude
                <input
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            {intelError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {intelError}
              </p>
            ) : null}
            {intelMsg ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {intelMsg}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveReporterContext()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Save & re-score'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void refreshIntelligence()}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Re-run hints only
              </button>
            </div>
          </div>
        )}

      {st === 'closed' &&
        issue.issueAttributes?.closure_kind === 'intake_duplicate_merge' && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
            <p className="font-semibold">Administrative duplicate closure</p>
            <p className="mt-1 text-slate-600">
              This registration was closed by intake as a duplicate of{' '}
              <Link
                className="font-mono font-semibold text-indigo-600 hover:underline"
                to={`/app/issues/${issue.issueAttributes.merged_into_issue_id}`}
              >
                ISS-{String(issue.issueAttributes.merged_into_issue_id)}
              </Link>
              . It was not closed because field work was completed on this reference.
            </p>
          </div>
        )}

      {issue.issueAttributes?.intake_consolidated_notes && (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-950">
          <p className="font-semibold">Consolidated intake notes</p>
          <p className="mt-2 whitespace-pre-wrap text-indigo-900/90">
            {String(issue.issueAttributes.intake_consolidated_notes)}
          </p>
        </div>
      )}

      {supervisorFlagged && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          <p className="font-semibold">Supervisor attention requested</p>
          <p className="mt-1 text-rose-900/90">
            {intakeOnlyView && !ackCaps
              ? 'This ticket is in the supervisor queue. Your note is below; a supervisor will review and route or decide.'
              : 'Intake or a unit officer flagged this ticket for a supervisor. Use dispatch and the note below; when you have routed or decided, mark it handled so the queue stays accurate.'}
          </p>
          {issue.issueAttributes?.cs_supervisor_note ? (
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-white/80 p-2 text-rose-900">
              {String(issue.issueAttributes.cs_supervisor_note)}
            </p>
          ) : null}
          {escalAck ? (
            <p className="mt-3 text-sm font-medium text-emerald-800">
              Escalation marked as handled
              {issue.issueAttributes?.cs_supervisor_acknowledged_at
                ? ` · ${format(new Date(String(issue.issueAttributes.cs_supervisor_acknowledged_at)), 'MMM d, yyyy HH:mm')}`
                : ''}
              .
            </p>
          ) : null}
          {ackCaps && !escalAck ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void acknowledgeSupervisorEscalation()}
              className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              Mark escalation handled
            </button>
          ) : null}
        </div>
      )}

      {intakeTools && st !== 'closed' && st !== 'resolved' && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-900">
            {deptSpecialist ? 'Intake & unit actions' : 'Customer service & intake'}
          </h2>
          <p className="mt-1 text-sm text-sky-900/85">
            {deptSpecialist
              ? 'Request a supervisor when you need policy or cross-unit decisions. Merge duplicates only after confirming the same incident. Unit officers may assign technicians and close resolved tickets for issues routed to their department.'
              : 'Request a supervisor when dispatch or policy needs a decision. Use duplicate merge only after you confirm the same incident already has an open primary record.'}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-sky-900/80">
                  Note to supervisor (optional)
                </label>
                <textarea
                  value={supervisorNote}
                  onChange={(e) => setSupervisorNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Why you need a supervisor…"
                  className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-500 focus:ring-2"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestSupervisor()}
                className="shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Request supervisor
              </button>
          </div>
          {st === 'reported' && (
            <div className="mt-5 border-t border-sky-200/80 pt-4">
              <button
                type="button"
                onClick={() => setDupPanelOpen((o) => !o)}
                className="text-sm font-semibold text-sky-950 underline decoration-sky-400 underline-offset-2 hover:text-sky-800"
              >
                {dupPanelOpen ? 'Hide duplicate merge' : 'Merge as duplicate…'}
              </button>
              {dupPanelOpen && issueId != null && (
                <div className="mt-3 rounded-lg border border-sky-100 bg-white p-4">
                  <DuplicateMergeWorkflow
                    duplicateIssueId={issueId}
                    onMerged={() => {
                      setDupPanelOpen(false);
                      setActionMsg('Duplicate merged. This record is now closed.');
                      void pullIssueSnapshot();
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mergeStandalone && st === 'reported' && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
            Duplicate merge
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Close this registration as a duplicate of another open primary when you have
            confirmed it is the same incident.
          </p>
          <div className="mt-4 border-t border-slate-200/80 pt-4">
            <button
              type="button"
              onClick={() => setDupStandaloneOpen((o) => !o)}
              className="text-sm font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:text-slate-700"
            >
              {dupStandaloneOpen ? 'Hide duplicate merge' : 'Merge as duplicate…'}
            </button>
            {dupStandaloneOpen && issueId != null && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                <DuplicateMergeWorkflow
                  duplicateIssueId={issueId}
                  onMerged={() => {
                    setDupStandaloneOpen(false);
                    setActionMsg('Duplicate merged. This record is now closed.');
                    void pullIssueSnapshot();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex gap-4 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setTab('overview')}
                className={`text-sm font-semibold ${
                  tab === 'overview'
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Description
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`text-sm font-semibold ${
                  tab === 'history'
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                History
              </button>
            </div>
            {tab === 'overview' ? (
              <>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-slate-100 px-2 py-1 font-semibold uppercase text-slate-700">
                    {issue.issueCategory.replace(/_/g, ' ')}
                  </span>
                  {issue.issueSubcategory ? (
                    <span className="rounded bg-slate-100 px-2 py-1 font-semibold uppercase text-slate-700">
                      {issue.issueSubcategory.replace(/_/g, ' ')}
                    </span>
                  ) : null}
                  <span className="rounded bg-indigo-100 px-2 py-1 font-semibold uppercase text-indigo-700">
                    Routed: {issue.assignedDepartment.replace(/_/g, ' ')}
                  </span>
                  {issue.affectedScope ? (
                    <span className="rounded bg-emerald-100 px-2 py-1 font-semibold uppercase text-emerald-700">
                      Scope: {issue.affectedScope}
                    </span>
                  ) : null}
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Full description
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-slate-800">
                  {issue.description}
                </p>
                {issue.location && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
                    <p className="font-medium text-slate-700">Location</p>
                    <p className="mt-1 text-slate-600">
                      {issue.location.addressDescription}
                    </p>
                    <p className="text-slate-500">
                      {issue.location.latitude},{' '}
                      {issue.location.longitude}
                      {issue.location.serviceArea
                        ? ` · ${issue.location.serviceArea}`
                        : ''}
                    </p>
                  </div>
                )}
                {billingResolutionRecord && issue.resolution ? (
                  <div className="mt-4">
                    <BillingResolutionSummary
                      record={billingResolutionRecord}
                      resolutionDetails={issue.resolution.resolutionDetails}
                      resolvedAt={issue.resolution.dateResolved}
                      resolvedByName={issue.resolution.resolvedBy.name}
                    />
                  </div>
                ) : issue.resolution ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">
                      Resolution
                    </p>
                    <p className="mt-1 text-sm text-emerald-900">
                      {issue.resolution.resolutionDetails}
                    </p>
                    <p className="mt-2 text-xs text-emerald-800">
                      {format(
                        new Date(issue.resolution.dateResolved),
                        'MMM d, yyyy',
                      )}{' '}
                      · {issue.resolution.resolvedBy.name}
                    </p>
                  </div>
                ) : null}
                {issue.issueAttributes?.field_progress ? (
                  <p className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-sm text-indigo-950">
                    <span className="font-semibold">
                      {categoryWorkflow.progressSectionTitle}:
                    </span>{' '}
                    {workProgressLabel(
                      issue.issueCategory,
                      issue.issueAttributes.field_progress,
                    )}
                  </p>
                ) : null}
                {issue.issueAttributes &&
                Object.keys(issue.issueAttributes).length > 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Structured issue data
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {Object.entries(issue.issueAttributes)
                        .filter(
                          ([k]) =>
                            !k.startsWith('cs_supervisor') &&
                            !k.startsWith('intake_duplicate_candidate') &&
                            !k.startsWith('intake_co_department') &&
                            !k.startsWith('intake_consolidated') &&
                            !k.startsWith('intake_merged_duplicate') &&
                            k !== 'merged_into_issue_id' &&
                            k !== 'closure_kind' &&
                            k !== 'field_progress' &&
                            !isBillingResolutionAttributeKey(k) &&
                            !k.startsWith('intake_duplicate_merge'),
                        )
                        .map(([k, v]) => (
                        <p key={k} className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">
                            {k.replace(/_/g, ' ')}:
                          </span>{' '}
                          {String(v)}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : canViewAudit(role) ? (
              <div className="space-y-3">
                {auditLoading ? (
                  <p className="text-sm text-slate-500">Loading history…</p>
                ) : issueAudit.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No issue-scoped audit entries yet (e.g. create, status
                    updates, close).
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {issueAudit.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-xs text-indigo-700">
                          {a.actionPerformed}
                        </span>
                        <p className="mt-1 text-slate-700">
                          <span className="font-medium">{a.user.name}</span>
                          <span className="text-slate-500">
                            {' '}
                            ·{' '}
                            {formatDistanceToNow(new Date(a.timestamp), {
                              addSuffix: true,
                            })}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/app/audit"
                  className="inline-block text-sm font-medium text-indigo-600 hover:underline"
                >
                  Open full audit log →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Detailed action history is available to supervisors and
                administrators in the Audit log.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Attachments ({attachments.length})
              </h2>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
                <Paperclip className="h-4 w-4" />
                Upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={onUpload}
                  disabled={busy}
                />
              </label>
            </div>
            <ul className="mt-4 space-y-2">
              {attachments.length === 0 ? (
                <li className="text-sm text-slate-500">No attachments yet.</li>
              ) : (
                attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
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
                ))
              )}
            </ul>
          </div>

          {tech && (
            <TechnicianIssueActions
              issue={issue}
              issueCategory={issue.issueCategory}
              issueSubcategory={issue.issueSubcategory}
              issueAccountNumber={issue.accountNumber}
              reportedTransactionId={reportedTxId}
              status={st}
              busy={busy}
              progressPick={fieldProgressPick}
              onProgressPickChange={setFieldProgressPick}
              onSaveProgress={() => void saveFieldProgress()}
              resolutionText={resolutionText}
              onResolutionTextChange={setResolutionText}
              onStartWork={() => void updateStatus('in_progress')}
              onResolve={() => void updateStatus('resolved')}
              billingForm={
                billingForm ??
                (issue.issueCategory === 'billing_account'
                  ? defaultBillingResolutionForm(issue)
                  : undefined)
              }
              onBillingFormChange={setBillingForm}
              billingContext={billingContext}
              billingContextLoading={billingContextLoading}
              onRefreshBillingContext={() => void loadBillingContext()}
              billingValidationError={billingValidationError}
              onBillingResolve={() => void submitBillingResolution()}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reporter
            </h3>
            <p className="mt-1 font-medium text-slate-900">{issue.reporterName}</p>
            <p className="text-sm text-slate-600">{issue.reporterPhone}</p>
            {issue.accountNumber ? (
              <p className="mt-2 text-xs text-slate-600">
                Account number: {issue.accountNumber}
              </p>
            ) : null}
            {issue.reporterEmail ? (
              <p className="mt-2 text-sm text-slate-600">
                <span className="text-xs font-medium uppercase text-slate-400">
                  Email (for closure notice)
                </span>
                <br />
                {issue.reporterEmail}
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-800">
                No reporter email — add one when logging issues so closure can
                notify them (or set NOTIFY_EMAIL on the server as a fallback).
              </p>
            )}
          </div>
          {hasSlaTargets && (
            <div
              className={`rounded-xl border p-5 shadow-sm ${
                slaBreached
                  ? 'border-rose-200 bg-rose-50/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                SLA targets
              </h3>
              {slaBreached && issue.slaBreachedAt ? (
                <p className="mt-2 text-sm font-semibold text-rose-800">
                  Resolution SLA breached ·{' '}
                  {format(new Date(issue.slaBreachedAt), 'MMM d, yyyy HH:mm')}
                </p>
              ) : resDue && resDue.getTime() < Date.now() && !slaBreached ? (
                <p className="mt-2 text-sm font-medium text-amber-800">
                  {intakeOnlyView
                    ? 'Resolution due time has passed; a supervisor monitors formal SLA breach stamping.'
                    : 'Resolution due time has passed; breach may be stamped on next refresh or batch job.'}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-600">
                  Clocks use server policy hours from category / subcategory.
                </p>
              )}
              {firstDue ? (
                <p className="mt-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">
                    First response due:
                  </span>{' '}
                  {format(firstDue, 'MMM d, yyyy HH:mm')}
                </p>
              ) : null}
              {resDue ? (
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">
                    Resolution due:
                  </span>{' '}
                  {format(resDue, 'MMM d, yyyy HH:mm')}
                </p>
              ) : null}
              {!intakeOnlyView &&
              issue.slaEscalationLevel != null &&
              issue.slaEscalationLevel > 0 ? (
                <p className="mt-2 text-xs font-medium text-slate-600">
                  Escalation level: {issue.slaEscalationLevel}
                </p>
              ) : null}
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Channel
            </h3>
            <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-700">
              {issue.reportChannel}
            </span>
          </div>
          {issue.createdBy && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Logged by
              </h3>
              <p className="mt-1 font-medium text-slate-900">
                {issue.createdBy.name}
              </p>
              <p className="text-sm text-slate-600">{issue.createdBy.email}</p>
            </div>
          )}
          {showAssign && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-800">
                <UserPlus className="h-4 w-4" />
                Assign / reassign
              </h3>
              <p className="mt-2 text-xs text-indigo-900/80">
                {st === 'reported'
                  ? 'Pick a technician. New complaints may already have auto-dispatch priority from urgency — match it below unless you deliberately override.'
                  : 'Someone may already be on this ticket (including auto-assign). Pick another technician here only if you are changing who owns field work.'}
              </p>
              {issue.currentAssignment && (
                <p className="mt-3 rounded-lg border border-indigo-100 bg-white/80 px-3 py-2 text-xs text-indigo-950">
                  <span className="font-semibold">Current assignment: </span>
                  {issue.currentAssignment.technicianName}
                  <span className="text-indigo-800">
                    {' '}
                    · dispatch priority{' '}
                    <span className="font-semibold capitalize">
                      {issue.currentAssignment.priorityLevel}
                    </span>
                  </span>
                  <span className="block text-[11px] text-indigo-800/85">
                    Assigned {formatDistanceToNow(new Date(issue.currentAssignment.assignmentDate), { addSuffix: true })}
                  </span>
                </p>
              )}
              <div className="mt-3 space-y-2">
                <select
                  value={pickTech}
                  onChange={(e) => setPickTech(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">
                    {st === 'assigned' ? 'Select technician to reassign…' : 'Select technician…'}
                  </option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
                <div>
                  <select
                    value={assignPri}
                    onChange={(e) => setAssignPri(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="low">Priority: low</option>
                    <option value="medium">Priority: medium</option>
                    <option value="high">Priority: high</option>
                  </select>
                  <p className="mt-1 text-[11px] text-indigo-900/65">
                    Defaults from complaint urgency (or latest assignment); change only when you need a stronger dispatch cue.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || technicians.length === 0}
                  onClick={() => void submitAssign()}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {st === 'reported' ? 'Assign issue' : 'Reassign'}
                </button>
                {suggestedTech && suggestedTech.ranked.length > 0 && (
                  <div className="mt-3 rounded-lg border border-indigo-100 bg-white p-3">
                    <p className="text-xs font-semibold text-indigo-900">
                      Suggested technicians
                    </p>
                    {suggestedTech.rankingsExplainer ? (
                      <p className="mt-1 text-[11px] leading-snug text-indigo-900/85">
                        {suggestedTech.rankingsExplainer}
                      </p>
                    ) : !suggestedTech.issueLocationAvailable ? (
                      <p className="mt-1 text-xs text-amber-800">
                        Issue has no usable coordinates — distance ranking is limited until lat/lng is set.
                      </p>
                    ) : null}
                    <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                      {suggestedTech.ranked.slice(0, 10).map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            className="w-full rounded px-1 py-1.5 text-left hover:bg-indigo-50"
                            onClick={() => setPickTech(String(row.id))}
                          >
                            <span className="font-medium text-slate-900">
                              {row.name}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-600">
                              {row.rankHint}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {technicians.length === 0 && (
                  <p className="text-xs text-amber-800">
                    No active technicians. Create technician users under Users.
                  </p>
                )}
              </div>
            </div>
          )}
          {tech && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Your workflow</p>
              <p className="mt-1 text-xs">
                {categoryWorkflow.lane === 'billing'
                  ? 'Start billing review → track desk progress → complete billing resolution with ledger outcome.'
                  : categoryWorkflow.lane === 'field'
                    ? 'Start field work → track crew progress → mark resolved with on-site details.'
                    : `Start work → save ${categoryWorkflow.progressSectionTitle.toLowerCase()} → ${categoryWorkflow.resolveButtonLabel.toLowerCase()}.`}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
