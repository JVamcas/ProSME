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

export type TaskDetail = {
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
};

export type CompleteChecklistTaskInput = {
  expectedRowVersion: number;
  items: ChecklistResultItem[];
};

export type TaskCompletionResult = {
  nextStageName: string | null;
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "COMPLETED";
  workflowStatus: "ACTIVE" | "COMPLETED";
};
