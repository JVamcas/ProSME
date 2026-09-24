import type { WorkflowActionAvailability } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";

export type ChecklistConfigurationItem = {
  code: string;
  label: string;
  required: boolean;
};

export type ChecklistResultItem = {
  accepted: boolean;
  code: string;
  comment?: string;
};

export type WorkflowTaskAction = WorkflowActionAvailability;

export type AuthoritativeEligibilityTaskResult = {
  eligible: boolean;
  evaluationId: string;
  evaluationNumber: number;
  hardFailureCount: number;
  manualScreeningRequired: boolean;
  outcome: "ELIGIBLE" | "INELIGIBLE" | null;
  softFailureCount: number;
  warningCount: number;
};

export type TaskDetail = {
  actions: WorkflowTaskAction[];
  eligibilityEvaluation: AuthoritativeEligibilityTaskResult | null;
  canEvaluateEligibility: boolean;
  hasChecklist: boolean;
  formCompleted: boolean;
  checklistCompleted: boolean;
  applicantName: string;
  applicationId: string;
  businessName: string | null;
  checklistItems: ChecklistConfigurationItem[];
  dueAt: string | null;
  fundingCallTitle: string;
  reference: string;
  resultItems: ChecklistResultItem[];
  rowVersion: number;
  runtimeVersion: number;
  stageInstanceId: string;
  stageName: string;
  taskInstanceId: string;
  taskName: string;
  taskStatus: string;
  workflowInstanceId: string;
  formVersionId?: string | null;
};

export type CompleteChecklistTaskInput = {
  actionKey?: string;
  expectedRowVersion: number;
  items: ChecklistResultItem[];
};

export type TaskCompletionResult = {
  actionKey: string | null;
  nextStageName: string | null;
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "IN_PROGRESS" | "COMPLETED";
  workflowStatus: "ACTIVE" | "COMPLETED";
};
