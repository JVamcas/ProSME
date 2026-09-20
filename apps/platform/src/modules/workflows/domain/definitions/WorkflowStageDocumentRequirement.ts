export const workflowDocumentFileTypes = [
  "PDF",
  "JPG",
  "PNG",
  "DOCX",
] as const;

export type WorkflowDocumentFileType =
  (typeof workflowDocumentFileTypes)[number];

export const workflowDocumentActors = [
  "APPLICANT",
  "ASSIGNED_REVIEWER",
  "STAFF",
] as const;

export type WorkflowDocumentActor = (typeof workflowDocumentActors)[number];

export const workflowDocumentVerifierActors = [
  "ASSIGNED_REVIEWER",
  "STAFF",
] as const;

export type WorkflowDocumentVerifierActor =
  (typeof workflowDocumentVerifierActors)[number];

export type WorkflowStageDocumentRequirement = {
  id?: string;
  name: string;
  mandatory: boolean;
  acceptedFileTypes: WorkflowDocumentFileType[];
  maximumSizeMb: number;
  expiryDays: number | null;
  uploader: WorkflowDocumentActor;
  verifier: WorkflowDocumentVerifierActor;
  templateReference: string;
};
