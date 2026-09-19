import { workflowTemplateStatuses } from "./WorkflowTemplate";
import type { WorkflowStageDefinition } from "./WorkflowStageDefinition";
import type { WorkflowTaskDefinition } from "./WorkflowTaskDefinition";

export const workflowStatuses = workflowTemplateStatuses;

export type WorkflowStatus = (typeof workflowStatuses)[number];

export const workflowActionCodes = [
  "CLAIM",
  "ASSIGN",
  "START",
  "SAVE",
  "COMPLETE",
  "SKIP",
  "REQUEST_INFORMATION",
  "ACCEPT_INFORMATION",
  "RECOMMEND_PROCEED",
  "RECOMMEND_REJECT",
  "APPROVE",
  "DECLINE",
  "RETURN",
  "OVERRIDE",
  "CANCEL",
] as const;

export type WorkflowActionCode = (typeof workflowActionCodes)[number];

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

export type WorkflowCondition =
  | { type: "ALL_REQUIRED_TASKS_COMPLETE" }
  | {
      type: "TASK_RESULT_EQUALS";
      taskCode: string;
      field: string;
      value: string | number | boolean;
    };

export type WorkflowTaskInput = WorkflowTaskDefinition & {
  type: TaskTypeCode;
  required: boolean;
  config: unknown;
  formVersionId?: string | null;
};

export type WorkflowStageInput = WorkflowStageDefinition & {
  initial: boolean;
  slaHours?: number | null;
  tasks: WorkflowTaskInput[];
};

export type WorkflowTransitionInput = {
  id?: string;
  fromStageCode: string;
  actionCode: WorkflowActionCode;
  toStageCode?: string | null;
  terminalOutcome?: string | null;
  requiredCapability: string;
  condition?: WorkflowCondition | null;
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
  assignmentOptions?: WorkflowAssignmentOptions;
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

export type PublishedWorkflowOption = {
  definitionId: string;
  name: string;
  versionId: string;
  versionNumber: number;
};

export type WorkflowAssignmentOption = {
  id: string;
  label: string;
};

export type WorkflowAssignmentOptions = {
  roles: WorkflowAssignmentOption[];
  users: WorkflowAssignmentOption[];
};
