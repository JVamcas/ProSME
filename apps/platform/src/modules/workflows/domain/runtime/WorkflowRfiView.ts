import type { FormFieldType, FormOption } from "@/modules/forms/FormTypes";
import type { WorkflowRfiStatus } from "./WorkflowRfi";

export type WorkflowRfiSummary = {
  applicationId: string;
  applicationReference: string;
  applicationTitle: string;
  createdAt: string;
  deadlineAt: string;
  id: string;
  instructions: string;
  isOverdue: boolean;
  question: string;
  respondedAt: string | null;
  rowVersion: number;
  status: WorkflowRfiStatus;
  taskId: string;
};

export type WorkflowRfiEditableField = {
  currentValue: unknown;
  label: string;
  options: FormOption[];
  path: string;
  type: Exclude<FormFieldType, "DOCUMENT">;
};

export type WorkflowRfiDocument = {
  acceptedFileTypes: ("PDF" | "JPG" | "PNG" | "DOCX")[];
  evidence: {
    fileName: string;
    sizeBytes: number;
    uploadedAt: string;
    versionId: string;
    versionNumber: number;
  } | null;
  maximumSizeMb: number;
  name: string;
  requirementId: string;
};

export type WorkflowRfiCorrespondenceEntry = {
  authorName: string;
  authorType: "APPLICANT" | "STAFF";
  conversationSequence: number;
  createdAt: string;
  entryType: "REQUEST" | "FOLLOW_UP" | "RESPONSE";
  id: string;
  message: string;
};

export type WorkflowRfiDetail = WorkflowRfiSummary & {
  closedAt: string | null;
  correspondence: WorkflowRfiCorrespondenceEntry[];
  draft: {
    fieldValues: Record<string, unknown>;
    rowVersion: number;
    updatedAt: string;
  } | null;
  editableFields: WorkflowRfiEditableField[];
  expiredAt: string | null;
  requestedDocuments: WorkflowRfiDocument[];
  response: {
    fieldValues: Record<string, unknown>;
    respondedAt: string;
  } | null;
  stageName: string;
  taskName: string;
};
