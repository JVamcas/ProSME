import type { QuorumRule } from "../runtime/Quorum";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { WorkflowElementPermissions } from "./WorkflowElementPermissions";

export const workflowTaskAssignmentModes = ["ROLE", "NAMED_USER"] as const;

export type WorkflowTaskAssignmentMode =
  (typeof workflowTaskAssignmentModes)[number];

export type WorkflowTaskFormBinding = {
  contextFields: ConditionFieldDefinition[];
  formVersionId: string;
};

export type WorkflowTaskDefinition = {
  actionKeys: string[];
  permissions: WorkflowElementPermissions;
  id?: string;
  stableKey: string;
  name: string;
  description: string;
  roleId?: string | null;
  namedUserOverrideId?: string | null;
  assignmentMode: WorkflowTaskAssignmentMode;
  reviewerCount: number;
  reviewRelease?: "STAGE_COMPLETED" | "THRESHOLD_MET" | "IMMEDIATE";
  requiredCompletionCount: number;
  completionMode?: "ALL" | "COUNT" | "PERCENT";
  completionPercentage?: number | null;
  quorum: boolean;
  quorumRule?: QuorumRule | null;
  coiRequired: boolean;
  displayOrder: number;
};
