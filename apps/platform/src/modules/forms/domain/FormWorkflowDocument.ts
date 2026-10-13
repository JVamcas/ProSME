export type FormWorkflowDocument = {
  stableKey: string;
  acceptedFileTypes: import("@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement").WorkflowDocumentFileType[];
  maximumSizeMb: number;
  expiryDays: number | null;
  requestOnStageActivation: boolean;
  uploader: "APPLICANT" | "ANY" | "ASSIGNED_REVIEWER" | "STAFF";
  verifier: "ASSIGNED_REVIEWER" | "STAFF";
  templateReference: string;
};
