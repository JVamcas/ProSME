import { z } from "zod";

import { workflowActionTypes } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import {
  taskTypeCodes,
  workflowActionCodes,
  workflowStatuses,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowPublicStatuses } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";
import { workflowTaskAssignmentModes } from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";
import { workflowConditionSchema } from "@/modules/workflows/WorkflowConditionRegistry";

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);
export const workflowTaskSchema = z
  .object({
    id: z.string().uuid().optional(),
    stableKey: codeSchema,
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000),
    roleId: z.string().uuid().nullable().optional(),
    namedUserOverrideId: z.string().uuid().nullable().optional(),
    assignmentMode: z.enum(workflowTaskAssignmentModes),
    reviewerCount: z.number().int().positive().max(100),
    requiredCompletionCount: z.number().int().positive().max(100),
    quorum: z.boolean(),
    coiRequired: z.boolean(),
    displayOrder: z.number().int().positive(),
    type: z.enum(taskTypeCodes),
    required: z.boolean(),
    config: z.unknown(),
    formVersionId: z.string().uuid().nullable().optional(),
  })
  .superRefine((task, context) => {
    if (task.requiredCompletionCount > task.reviewerCount) {
      context.addIssue({
        code: "custom",
        message: "Required completions cannot exceed the reviewer count.",
        path: ["requiredCompletionCount"],
      });
    }
    if (task.assignmentMode === "NAMED_USER" && task.reviewerCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Named-user assignment supports exactly one reviewer.",
        path: ["reviewerCount"],
      });
    }
    if (
      task.quorum &&
      (task.reviewerCount < 2 ||
        task.requiredCompletionCount * 2 <= task.reviewerCount)
    ) {
      context.addIssue({
        code: "custom",
        message: "Quorum requires a majority of at least two reviewers.",
        path: ["quorum"],
      });
    }
  });

export const workflowActionDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  stableKey: codeSchema,
  label: z.string().trim().min(2).max(160),
  actionType: z.enum(workflowActionTypes),
  enabled: z.boolean(),
  reasonCodeRequired: z.boolean(),
  displayOrder: z.number().int().positive(),
});

export const workflowStageSchema = z.object({
  id: z.string().uuid().optional(),
  stableKey: codeSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""),
  enabled: z.boolean(),
  optional: z.boolean(),
  displayOrder: z.number().int().positive(),
  publicStatusMapping: z.object({
    status: z.enum(workflowPublicStatuses),
    label: z.string().trim().min(2).max(120),
    description: z.string().trim().min(2).max(300),
  }),
  repeatable: z.boolean(),
  coiGated: z.boolean(),
  initial: z.boolean(),
  slaHours: z.number().int().positive().max(8760).nullable().optional(),
  actions: z.array(workflowActionDefinitionSchema),
  tasks: z.array(workflowTaskSchema),
});

export const workflowTransitionSchema = z.object({
  id: z.string().uuid().optional(),
  fromStageCode: codeSchema,
  actionCode: z.enum(workflowActionCodes),
  toStageCode: codeSchema.nullable().optional(),
  terminalOutcome: codeSchema.nullable().optional(),
  requiredCapability: z.string().trim().min(3).max(120),
  condition: workflowConditionSchema.nullable().optional(),
});

export const workflowGraphSchema = z.object({
  stages: z.array(workflowStageSchema),
  transitions: z.array(workflowTransitionSchema),
});

export const createWorkflowSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""),
  useReferenceWorkflow: z.boolean().default(true),
});

export const updateWorkflowDetailsSchema = createWorkflowSchema
  .omit({ useReferenceWorkflow: true })
  .extend({
    expectedRowVersion: z.number().int().positive(),
  });

export const updateWorkflowDraftSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
  graph: workflowGraphSchema,
});

export const workflowCommandSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
  versionId: z.string().uuid(),
});

export const opportunityAssignmentSchema = z.object({
  fundingOpportunityId: z.number().int().positive(),
  fundingOpportunityTitle: z.string().trim().min(2).max(200),
  workflowVersionId: z.string().uuid(),
  expectedRowVersion: z.number().int().nonnegative().default(0),
});

export const workflowStatusSchema = z.enum(workflowStatuses);
