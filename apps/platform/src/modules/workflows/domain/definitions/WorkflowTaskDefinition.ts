export const workflowTaskAssignmentModes = ["ROLE", "NAMED_USER"] as const;

export type WorkflowTaskAssignmentMode =
  (typeof workflowTaskAssignmentModes)[number];

export type WorkflowTaskDefinition = {
  id?: string;
  stableKey: string;
  name: string;
  description: string;
  roleId?: string | null;
  namedUserOverrideId?: string | null;
  assignmentMode: WorkflowTaskAssignmentMode;
  reviewerCount: number;
  requiredCompletionCount: number;
  quorum: boolean;
  coiRequired: boolean;
  displayOrder: number;
};
