export const workflowDocumentFileTypes = [
  "PDF",
  "JPG",
  "PNG",
  "DOCX",
  "JPEG",
  "XLS",
  "XLSX",
  "TXT",
  "CSV",
] as const;

export type WorkflowDocumentFileType =
  (typeof workflowDocumentFileTypes)[number];

export const workflowDocumentActors = [
  "ANY",
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
  stableKey: string;
  name: string;
  taskStableKey: string;
  mandatory: boolean;
  acceptedFileTypes: WorkflowDocumentFileType[];
  maximumSizeMb: number;
  maxPages?: number | null;
  acceptedExtensions?:
    | import("@/modules/forms/domain/FormDocumentTypes").FormDocumentExtension[]
    | null;
  expiryDays: number | null;
  requestOnStageActivation: boolean;
  uploader: WorkflowDocumentActor;
  verifier: WorkflowDocumentVerifierActor;
  templateReference: string;
};

export const workflowDocumentExtensions = {
  DOCX: [".docx"],
  JPG: [".jpg", ".jpeg"],
  JPEG: [".jpeg"],
  PDF: [".pdf"],
  PNG: [".png"],
  XLS: [".xls"],
  XLSX: [".xlsx"],
  TXT: [".txt"],
  CSV: [".csv"],
} as const;
