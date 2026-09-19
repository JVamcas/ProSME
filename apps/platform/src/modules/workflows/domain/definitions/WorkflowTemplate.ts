export const workflowTemplateStatuses = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PUBLISHED",
  "RETIRED",
] as const;

export type WorkflowTemplateStatus = (typeof workflowTemplateStatuses)[number];

export type WorkflowTemplateDetails = {
  code: string;
  name: string;
  description: string;
};

export type WorkflowTemplate = WorkflowTemplateDetails & {
  id: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowTemplateVersion = {
  id: string;
  definitionId: string;
  versionNumber: number;
  status: WorkflowTemplateStatus;
  rowVersion: number;
  metadata: WorkflowTemplateDetails;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedBy: string | null;
  publishedAt: Date | null;
  retiredAt: Date | null;
};

export type WorkflowTemplateListItem = WorkflowTemplateDetails & {
  id: string;
  currentVersion: {
    id: string;
    number: number;
    rowVersion: number;
    status: WorkflowTemplateStatus;
  };
  updatedAt: string;
};

export const workflowTemplateTransitions = {
  SUBMIT: { from: "DRAFT", to: "PENDING_APPROVAL" },
  RETURN: { from: "PENDING_APPROVAL", to: "DRAFT" },
  APPROVE: { from: "PENDING_APPROVAL", to: "APPROVED" },
  PUBLISH: { from: "APPROVED", to: "PUBLISHED" },
  RETIRE: { from: "PUBLISHED", to: "RETIRED" },
} as const;

export type WorkflowTemplateCommand = keyof typeof workflowTemplateTransitions;
