import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { WorkflowStageChecklistDefinition } from "./WorkflowStageChecklistDefinition";
import type { WorkflowStageDocumentRequirement } from "./WorkflowStageDocumentRequirement";
import type { WorkflowStageScoringDefinition } from "./WorkflowStageScoringDefinition";
import type { WorkflowStageCommentField } from "./WorkflowStageCommentField";

export const workflowPublicStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "OUTCOME_AVAILABLE",
  "CLOSED",
  "WITHDRAWN",
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
  optional: boolean;
  displayOrder: number;
  publicStatusMapping: WorkflowPublicStatusMapping;
  repeatable: boolean;
  coiGated: boolean;
  entryCondition: ConditionGroup | null;
  exitCondition: ConditionGroup | null;
  checklistItems: WorkflowStageChecklistDefinition[];
  documentRequirements: WorkflowStageDocumentRequirement[];
  scoring: WorkflowStageScoringDefinition | null;
  commentFields: WorkflowStageCommentField[];
};
