import type { EligibilityFailureStatus } from "@/modules/workflows/domain/definitions/WorkflowEligibilityFailureStatus";
import type { WorkflowActionAvailability } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import type { WorkflowTaskDisplayMode } from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";

export type ChecklistConfigurationItem = {
  code: string;
  label: string;
  required: boolean;
};

export type DocumentRequirementItem = {
  acceptedFileTypes: ("PDF" | "JPG" | "PNG" | "DOCX")[];
  expiryDays: number | null;
  evidenceUploaded?: boolean;
  id?: string;
  mandatory: boolean;
  maximumSizeMb: number;
  name: string;
  stableKey: string;
  requestStatus: "MISSING" | "REQUESTED" | "SUPPLIED" | "EXPIRED";
  templateReference: string;
  uploader: "APPLICANT" | "ASSIGNED_REVIEWER" | "STAFF";
  verifier: "ASSIGNED_REVIEWER" | "STAFF";
  document?: WorkflowTaskDocumentView | null;
};

export type WorkflowTaskDocumentView = {
  contentType: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  versionId: string;
  versionNumber: number;
};

export type DocumentResultItem = {
  category: string;
  comment?: string;
  outcome: "VERIFIED" | "REJECTED" | "";
};

export type ScoringCriterionItem = {
  criterion: string;
  description: string;
  stableKey: string;
  mandatoryComment: boolean;
  scaleMaximum: number;
  scaleMinimum: number;
  weight: number;
};

export type ScoringConfiguration = {
  aggregation: "WEIGHTED_AVERAGE" | "WEIGHTED_SUM" | "AVERAGE" | "SUM";
  criteria: ScoringCriterionItem[];
};

export type ScoreResultItem = {
  comment?: string;
  criterion: string;
  score: number | null;
};

export type CommentConfigurationItem = {
  key: string;
  label: string;
  helpText: string;
  mandatory: boolean;
  visibility: "APPLICANT_VISIBLE" | "INTERNAL_ONLY";
  displayOrder: number;
};

export type CommentResultItem = {
  key: string;
  value: string;
};

export type ChecklistResultItem = {
  accepted: boolean;
  code: string;
  comment?: string;
};

export type WorkflowTaskAction = WorkflowActionAvailability;

export type AuthoritativeEligibilityTaskResult = {
  terminalStatus?: EligibilityFailureStatus;
  eligible: boolean;
  evaluationId: string;
  evaluationNumber: number;
  hardFailureCount: number;
  manualScreeningRequired: boolean;
  outcome: "ELIGIBLE" | "INELIGIBLE" | null;
  softFailureCount: number;
  warningCount: number;
};

export type TaskDetail = {
  processingStatus?: "ON_HOLD" | null;
  holds?: import("@/modules/workflows/domain/runtime/WorkflowHold").WorkflowHoldSummary[];
  actions: WorkflowTaskAction[];
  eligibilityEvaluation: AuthoritativeEligibilityTaskResult | null;
  canEvaluateEligibility: boolean;
  hasChecklist: boolean;
  formCompleted: boolean;
  formName: string | null;
  checklistCompleted: boolean;
  commentFields: CommentConfigurationItem[];
  displayMode: WorkflowTaskDisplayMode;
  commentCompleted: boolean;
  resultComments: CommentResultItem[];
  applicantName: string;
  applicationId: string;
  businessName: string | null;
  checklistItems: ChecklistConfigurationItem[];
  dueAt: string | null;
  documentRequirements: DocumentRequirementItem[];
  documentsCompleted: boolean;
  fundingCallTitle: string;
  reference: string;
  resultDocuments: DocumentResultItem[];
  resultItems: ChecklistResultItem[];
  resultScores: ScoreResultItem[];
  rowVersion: number;
  runtimeVersion: number;
  stageInstanceId: string;
  stageName: string;
  scoring: ScoringConfiguration | null;
  scoringCompleted: boolean;
  taskInstanceId: string;
  taskName: string;
  taskType: "CONTRIBUTING" | "STAGE_DECISION";
  taskStatus: string;
  workflowInstanceId: string;
  formVersionId?: string | null;
};

export type CompleteChecklistTaskInput = {
  actionKey?: string;
  expectedRowVersion: number;
  items: ChecklistResultItem[];
  comments?: CommentResultItem[];
  documents?: DocumentResultItem[];
  scores?: ScoreResultItem[];
};

export type SaveTaskReviewDraftInput = {
  comments?: CommentResultItem[];
  documents?: DocumentResultItem[];
  items?: ChecklistResultItem[];
  scores?: ScoreResultItem[];
};

export type TaskCompletionResult = {
  actionKey: string | null;
  nextStageName: string | null;
  rowVersion: number;
  taskInstanceId: string;
  taskStatus: "IN_PROGRESS" | "COMPLETED";
  workflowStatus: "ACTIVE" | "COMPLETED";
};
