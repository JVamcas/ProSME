export const workflowStatuses = ["DRAFT", "PUBLISHED", "RETIRED"] as const;

export type WorkflowStatus = (typeof workflowStatuses)[number];

export const taskTypeCodes = [
  "AUTOMATED_RULE_CHECK",
  "CHECKLIST",
  "DOCUMENT_REVIEW",
  "STRUCTURED_FORM",
  "ASSESSMENT_FORM",
  "FINANCE_REVIEW",
  "INFORMATION_REQUEST",
  "RECOMMENDATION",
  "DECISION",
  "COMMUNICATION",
] as const;

export type TaskTypeCode = (typeof taskTypeCodes)[number];

export type WorkflowTaskInput = {
  id?: string;
  code: string;
  name: string;
  type: TaskTypeCode;
  sequence: number;
  required: boolean;
  assignmentRoleId?: string | null;
  assignmentUserId?: string | null;
  config: unknown;
};

export type WorkflowStageInput = {
  id?: string;
  code: string;
  name: string;
  sequence: number;
  initial: boolean;
  applicantStatus: string;
  applicantLabel: string;
  applicantDescription: string;
  defaultRoleId?: string | null;
  slaHours?: number | null;
  tasks: WorkflowTaskInput[];
};

export type WorkflowTransitionInput = {
  id?: string;
  fromStageCode: string;
  actionCode: string;
  toStageCode?: string | null;
  terminalOutcome?: string | null;
  requiredCapability: string;
  condition?: Record<string, unknown> | null;
};

export type WorkflowGraphInput = {
  stages: WorkflowStageInput[];
  transitions: WorkflowTransitionInput[];
};

export type WorkflowValidationIssue = {
  code: string;
  message: string;
  path: string;
};

export type WorkflowValidation = {
  valid: boolean;
  errors: WorkflowValidationIssue[];
  warnings: WorkflowValidationIssue[];
};

export type WorkflowDefinitionSummary = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  latestVersion: number;
  latestStatus: WorkflowStatus;
  updatedAt: string;
};

export type WorkflowEditorView = {
  definition: {
    id: string;
    code: string;
    name: string;
    description: string;
  };
  version: {
    id: string;
    number: number;
    status: WorkflowStatus;
    createdAt: string;
    publishedAt: string | null;
    retiredAt: string | null;
    rowVersion: number;
  };
  graph: WorkflowGraphInput;
  validation: WorkflowValidation;
  allowedActions: string[];
};

export type WorkflowOpportunityAssignment = {
  fundingOpportunityId: number;
  fundingOpportunityTitle: string;
  workflowVersionId: string;
  workflowName: string;
  versionNumber: number;
  assignedAt: string;
  rowVersion: number;
};
