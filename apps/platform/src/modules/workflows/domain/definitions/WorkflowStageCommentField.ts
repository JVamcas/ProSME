export const workflowCommentFieldVisibilities = [
  "APPLICANT_VISIBLE",
  "INTERNAL_ONLY",
] as const;

export type WorkflowCommentFieldVisibility =
  (typeof workflowCommentFieldVisibilities)[number];

export type WorkflowStageCommentField = {
  id?: string;
  key: string;
  label: string;
  helpText: string;
  mandatory: boolean;
  visibility: WorkflowCommentFieldVisibility;
  displayOrder: number;
};
