import { z } from "zod";

import {
  taskTypeCodes,
  workflowActionCodes,
  workflowStatuses,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowConditionSchema } from "@/modules/workflows/WorkflowConditionRegistry";

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);
const assignmentSchema = {
  assignmentRoleId: z.string().uuid().nullable().optional(),
  assignmentUserId: z.string().uuid().nullable().optional(),
};

export const workflowTaskSchema = z.object({
  id: z.string().uuid().optional(),
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  type: z.enum(taskTypeCodes),
  sequence: z.number().int().positive(),
  required: z.boolean(),
  ...assignmentSchema,
  config: z.unknown(),
});

export const workflowStageSchema = z.object({
  id: z.string().uuid().optional(),
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  sequence: z.number().int().positive(),
  initial: z.boolean(),
  applicantStatus: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "ACTION_REQUIRED",
    "OUTCOME_AVAILABLE",
    "CLOSED",
    "WITHDRAWN",
  ]),
  applicantLabel: z.string().trim().min(2).max(120),
  applicantDescription: z.string().trim().min(2).max(300),
  slaHours: z.number().int().positive().max(8760).nullable().optional(),
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
  stages: z.array(workflowStageSchema).min(1),
  transitions: z.array(workflowTransitionSchema).min(1),
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
