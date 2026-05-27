export type StatusEntity = { name: string };

/** From GET /issue/:id/status-history */
export type StatusHistoryStep = {
  status: string;
  changedAt: string;
  changedBy: { name: string; email: string; role: string } | null;
};

export type IssueRow = {
  id: number;
  description: string;
  severityLevel: string;
  issueCategory: string;
  issueSubcategory?: string | null;
  assignedDepartment: string;
  urgencyLevel: string;
  accountNumber?: string | null;
  affectedScope?: string | null;
  issueAttributes?: Record<string, string | number> | null;
  reportChannel: string;
  dateReported: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail?: string | null;
  currentStatus: StatusEntity;
  location?: {
    latitude: string | number;
    longitude: string | number;
    addressDescription: string;
    serviceArea?: string | null;
  };
  createdBy?: { name: string; email: string };
  /** Latest field assignment (manual or auto-dispatch); for staff issue detail UI. */
  currentAssignment?: {
    technicianId: number;
    technicianName: string;
    priorityLevel: string;
    assignmentDate: string;
  } | null;
  /** Operational SLA targets (ISO datetimes when set). */
  slaFirstResponseDueAt?: string | null;
  slaResolutionDueAt?: string | null;
  slaBreachedAt?: string | null;
  slaEscalationLevel?: number;
};

export type ResolutionDto = {
  resolutionDetails: string;
  dateResolved: string;
  resolvedBy: { name: string; email: string };
};

export type DepartmentPlaybookCoDepartment = {
  departmentKey: string;
  label: string;
  when: string;
};

export type DepartmentPlaybookDto = {
  category: string;
  primaryDepartmentKey: string;
  primaryDepartmentLabel: string;
  mission: string;
  typicalIssues: string[];
  coDepartments: DepartmentPlaybookCoDepartment[];
  resolutionActors: string[];
};

export type IntakeIntelligenceSummary = {
  duplicateCandidateCount: number;
  duplicateSkippedReason?: string;
  coDepartmentSuggestions?: string;
  refreshedAt: string;
};

export type BillingCustomerNotificationDelivery = {
  channel: string;
  smsSent: boolean;
  emailSent: boolean;
  attemptedAt: string;
  detail: string;
};

export type IssueDetail = IssueRow & {
  resolution?: ResolutionDto | null;
  departmentPlaybook?: DepartmentPlaybookDto | null;
  intakeIntelligence?: IntakeIntelligenceSummary;
  billingCustomerNotification?: BillingCustomerNotificationDelivery | null;
};

export type AttachmentDto = {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  downloadPath: string;
};

export type IssuesPageResponse = {
  items: IssueRow[];
  total: number;
  skip: number;
  take: number;
};

export type ReportSummary = {
  totals: { issues: number };
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory?: Record<string, number>;
  bySubcategory?: Record<string, number>;
  byDepartment?: Record<string, number>;
  byReportChannel?: Record<string, number>;
  byServiceArea?: Record<string, number>;
};

export type ResolutionStats = {
  resolvedCount: number;
  avgHoursReportedToResolved: number | null;
};

export type IssuesByMonth = {
  issuesByMonth: { month: string; count: number }[];
};

export type TopFailingSubcategories = {
  items: { subcategory: string; openCount: number }[];
};

export type ResolutionBySubcategory = {
  items: {
    subcategory: string;
    resolvedCount: number;
    avgHoursReportedToResolved: number | null;
  }[];
};

export type DepartmentSlaBySubcategory = {
  slaHours: number;
  items: {
    department: string;
    subcategory: string;
    resolvedCount: number;
    withinSlaCount: number;
    slaRatePercent: number;
  }[];
};

export type SuggestedTechniciansResponse = {
  issueId: number;
  issueLocationAvailable: boolean;
  rankingsExplainer?: string;
  ranked: {
    id: number;
    name: string;
    email: string;
    distanceKm: number | null;
    workloadActive: number;
    rankHint: string;
  }[];
};

export type OperationalPulse = {
  generatedAt: string;
  openIssuesSlaBreached: number;
  openIssuesPastResolutionDueNotStamped: number;
  /** Resolved status issues with resolution timestamp since 00:00 UTC today */
  resolvedTodayCount: number;
  technicianWorkload: {
    technicianId: number;
    technicianName: string;
    activeAssignments: number;
  }[];
};

export type GeoHotspotsResponse = {
  items: { latitude: number; longitude: number; issueCount: number }[];
};

export type PremiseMeterLookupResponse = {
  found: boolean;
  meterNumber: string;
  customerId?: string;
  customerName?: string;
  accountNumber?: string;
  physicalAddress?: string;
  district?: string;
  area?: string;
  meterSerial?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: string;
  supplyZone?: string;
  meterType?: string;
  accountType?: string;
  accountStatus?: string;
  connectionStatus?: string;
  openIssuesOnPremise?: number;
  requiresOwnershipVerification?: boolean;
  phoneHintLast4?: string;
  registeredPhoneMasked?: string;
};

export type PublicDistrictRow = {
  number: number;
  name: string;
  code: string;
};

export type PublicLocationsResponse = {
  districtNumber: number;
  districtName: string;
  code: string;
  locations: { number: number; label: string }[];
};

export type MeterVerifyStartResponse = {
  verificationId: string;
  message: string;
  demoOtp?: string;
};

export type PublicAssignmentSummary = {
  assigned: boolean;
  assigneeName: string;
  assigneePhone: string | null;
  estimatedResponseHours: number;
  departmentLabel: string;
  currentStatus: string;
};

export type PublicIssueCreateResult = {
  id: number;
  reference: string;
  publicReference: string | null;
  issueCategory: string;
  issueSubcategory: string | null;
  currentStatus: string;
  assignment: PublicAssignmentSummary | null;
};

export type PublicTrackResponse = {
  issue: {
    id: number;
    reference: string;
    description: string;
    issueCategory: string;
    issueSubcategory: string | null;
    assignedDepartment: string;
    currentStatus: string;
    urgencyLevel: string;
    dateReported: string;
    location: {
      addressDescription: string;
      serviceArea: string | null;
    } | null;
    customerResolutionFeedback?: string | null;
    customerResolutionComment?: string | null;
    customerResolutionAt?: string | null;
    premiseSummary?: {
      found: boolean;
      meterNumber?: string;
      customerName?: string;
      accountNumber?: string;
      physicalAddress?: string;
      serviceArea?: string;
      supplyZone?: string;
      meterType?: string;
      accountStatus?: string;
      openIssuesOnPremise?: number;
    } | null;
  };
  timeline: Array<{
    status: string;
    changedAt: string;
  }>;
  notifications: Array<{
    title: string;
    message: string;
    at: string;
  }>;
  /** Expectations and self-help aligned with common utility customer portals */
  citizenGuidance: {
    headline: string;
    bullets: string[];
    disclaimer: string;
  };
};

export type AuditEntry = {
  id: number;
  actionPerformed: string;
  entityName: string;
  entityId: number;
  timestamp: string;
  user: { name: string; email: string };
};

export type AuditPage = {
  items: AuditEntry[];
  total: number;
};

export type AssignmentRow = {
  id: number;
  priorityLevel: string;
  assignmentDate: string;
  issue: IssueRow;
  assignedTo: { id: number; name: string };
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string | null;
  isActive: boolean;
};

export type UsersListResponse = {
  items: UserRow[];
  total: number;
};

export type TechnicianOption = {
  id: number;
  name: string;
  email: string;
};
