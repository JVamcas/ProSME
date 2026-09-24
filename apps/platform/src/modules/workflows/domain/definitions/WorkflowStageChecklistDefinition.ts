export const workflowChecklistResponseTypes = [
  "YES_NO",
  "TEXT",
  "NUMBER",
  "DATE",
] as const;

export type WorkflowChecklistResponseType =
  (typeof workflowChecklistResponseTypes)[number];

export const workflowChecklistEvidenceRequirements = [
  "NONE",
  "OPTIONAL",
  "REQUIRED",
] as const;

export type WorkflowChecklistEvidenceRequirement =
  (typeof workflowChecklistEvidenceRequirements)[number];

export type WorkflowStageChecklistDefinition = {
  id?: string;
  key: string;
  text: string;
  mandatory: boolean;
  responseType: WorkflowChecklistResponseType;
  evidenceRequirement: WorkflowChecklistEvidenceRequirement;
  notes: string;
  displayOrder: number;
};
