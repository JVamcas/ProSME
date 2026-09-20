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

export type WorkflowTaskAction = {
  actionType: WorkflowActionType;
  key: string;
  label: string;
};

export type TaskDetail = {
  actions: WorkflowTaskAction[];
  applicantName: string;
  applicationId: string;
  businessName: string | null;
  checklistItems: ChecklistConfigurationItem[];
  dueAt: string | null;
  fundingCallTitle: string;
  reference: string;
  resultItems: ChecklistResultItem[];
  rowVersion: number;
  stageName: string;
  taskInstanceId: string;
  taskName: string;
  taskStatus: string;
  taskType: string;
  formVersionId?: string | null;
};

export type CompleteChecklistTaskInput = {
  actionKey: string;
  expectedRowVersion: number;
  items: ChecklistResultItem[];
};

export type TaskCompletionResult = {
  actionKey: string;
  nextStageName: string | null;
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "COMPLETED";
  workflowStatus: "ACTIVE" | "COMPLETED";
};
import type { WorkflowActionType } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
