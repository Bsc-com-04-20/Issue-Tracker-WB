export type ConversationStep = {
  id: string;
  prompt: string;
  type: 'text' | 'select';
  optional?: boolean;
  helperText?: string;
  /** When true, step is shown only after prior answers (branching). */
  branchOnly?: boolean;
};

export type FlowSelectOption = {
  value: string;
  label: string;
};

export type MaintenanceNotice = {
  restorationTime: string;
  workOrderRef: string;
  summary: string;
};

export type WaterSupplyPriority = {
  severity: 'low' | 'medium' | 'high';
  urgency: 'normal' | 'urgent' | 'critical';
  scope: 'household' | 'street' | 'community';
  label: string;
  score: number;
};
