import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { WorkflowStageChecklistDefinition } from "./WorkflowStageChecklistDefinition";
import type { WorkflowStageCommentField } from "./WorkflowStageCommentField";
import type { WorkflowStageDocumentRequirement } from "./WorkflowStageDocumentRequirement";
import type { WorkflowStageScoringDefinition } from "./WorkflowStageScoringDefinition";

export const workflowPublicStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "OUTCOME_AVAILABLE",
  "CLOSED",
  "WITHDRAWN",
  "INELIGIBLE",
  "REJECTED",
  "REJECTED_INCOMPLETE",
] as const;

export type WorkflowPublicStatus = (typeof workflowPublicStatuses)[number];

export type WorkflowPublicStatusMapping = {
  status: WorkflowPublicStatus;
  label: string;
  description: string;
};

export type WorkflowStageDefinition = {
  id?: string;
  stableKey: string;
  name: string;
  description: string;
  enabled: boolean;
  allowApplicantWithdrawal?: boolean;
  optional: boolean;
  displayOrder: number;
  publicStatusMapping: WorkflowPublicStatusMapping;
  repeatable: boolean;
  coiGated: boolean;
  coiFormVersionId: string | null;
  entryCondition: ConditionGroup | null;
  exitCondition: ConditionGroup | null;
  joinPredecessorStageKeys: string[];
  checklistItems: WorkflowStageChecklistDefinition[];
  commentFields?: WorkflowStageCommentField[];
  documentRequirements: WorkflowStageDocumentRequirement[];
  scoring: WorkflowStageScoringDefinition[] | null;
};
