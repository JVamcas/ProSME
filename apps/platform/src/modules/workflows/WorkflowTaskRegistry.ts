import { z } from "zod";

import { fieldSchema, itemSchema, optionSchema } from "./WorkflowTaskSchemas";
import {
  type WorkflowTaskContract,
  workflowTaskContracts,
} from "./WorkflowTaskContracts";
import type { TaskTypeCode } from "@/modules/workflows/domain/definitions/WorkflowTypes";

export type WorkflowTaskHandler = (result: unknown) => unknown;

export type WorkflowTaskRegistryEntry = WorkflowTaskContract & {
  config: z.ZodType;
  handler: WorkflowTaskHandler;
  result: z.ZodType;
};

const registry = {
  AUTOMATED_RULE_CHECK: {
    config: z.object({
      rulesetCode: z.string().min(1),
      ruleVersion: z.number().int().positive(),
      inputs: z.array(z.string()).min(1),
      categories: z.array(optionSchema).min(1),
    }),
    result: z.object({
      category: z.string().min(1),
      score: z.number().optional(),
      reasons: z.array(z.string()),
      ruleVersion: z.number().int().positive(),
    }),
  },
  CHECKLIST: {
    config: z.object({ items: z.array(itemSchema).min(1).max(30) }),
    result: z.object({
      items: z.array(
        z.object({
          code: z.string().min(1).max(80),
          accepted: z.boolean(),
          comment: z.string().trim().max(1000).optional(),
        }),
      ).min(1).max(30),
    }),
  },
  DOCUMENT_REVIEW: {
    config: z.object({
      categories: z.array(optionSchema).min(1),
      outcomes: z.array(optionSchema).min(1),
    }),
    result: z.object({
      decisions: z.array(
        z.object({
          category: z.string(),
          outcome: z.string(),
          comment: z.string().optional(),
        }),
      ),
    }),
  },
  STRUCTURED_FORM: {
    config: z.object({ fields: z.array(fieldSchema).min(1) }),
    result: z.object({ values: z.record(z.string(), z.unknown()) }),
  },
  ASSESSMENT_FORM: {
    config: z.object({
      criteria: z
        .array(
          z.object({
            code: z.string(),
            label: z.string(),
            maximumScore: z.number().positive(),
            weight: z.number().positive(),
            commentRequired: z.boolean().default(false),
          }),
        )
        .min(1),
    }),
    result: z.object({
      scores: z.record(z.string(), z.number()),
      weightedTotal: z.number(),
      comments: z.record(z.string(), z.string()),
    }),
  },
  FINANCE_REVIEW: {
    config: z.object({
      fields: z.array(fieldSchema).min(1),
      recommendations: z.array(optionSchema).min(1),
    }),
    result: z.object({
      values: z.record(z.string(), z.unknown()),
      recommendation: z.string(),
    }),
  },
  INFORMATION_REQUEST: {
    config: z.object({
      categories: z.array(optionSchema).min(1),
      responseRequired: z.boolean(),
      templateReference: z.string().min(1),
    }),
    result: z.object({
      requestId: z.string().uuid(),
      outcome: z.string().min(1),
    }),
  },
  RECOMMENDATION: {
    config: z.object({
      options: z.array(optionSchema).min(1),
      rationaleRequired: z.boolean(),
    }),
    result: z.object({
      recommendation: z.string().min(1),
      rationale: z.string(),
    }),
  },
  DECISION: {
    config: z.object({
      outcomes: z.array(optionSchema).min(1),
      authorityCapability: z.string().min(1),
      rationaleRequired: z.boolean(),
    }),
    result: z.object({
      decision: z.string().min(1),
      rationale: z.string(),
      authoritySnapshot: z.string().min(1),
    }),
  },
  COMMUNICATION: {
    config: z.object({
      template: z.string().min(1),
      channel: z.enum(["EMAIL", "IN_APP"]),
      audience: z.enum(["APPLICANT", "STAFF"]),
      trigger: z.string().min(1),
    }),
    result: z.object({
      outboxId: z.string().uuid(),
      deliveryState: z.enum([
        "PENDING",
        "SENDING",
        "DELIVERED",
        "FAILED",
        "CANCELLED",
      ]),
    }),
  },
} satisfies Record<
  TaskTypeCode,
  {
    config: z.ZodType;
    result: z.ZodType;
  }
>;

export function getTaskRegistryEntry(
  type: TaskTypeCode,
): WorkflowTaskRegistryEntry {
  const schemas = registry[type];
  return {
    ...schemas,
    ...workflowTaskContracts[type],
    handler: (result: unknown) => schemas.result.parse(result),
  };
}

export function listTaskRegistryEntries() {
  return Object.keys(registry).map((type) => ({
    type: type as TaskTypeCode,
    ...getTaskRegistryEntry(type as TaskTypeCode),
  }));
}

export function validateTaskConfiguration(type: TaskTypeCode, config: unknown) {
  return registry[type].config.safeParse(config);
}

export function validateTaskResult(type: TaskTypeCode, result: unknown) {
  return registry[type].result.safeParse(result);
}

export function handleTaskResult(type: TaskTypeCode, result: unknown) {
  return getTaskRegistryEntry(type).handler(result);
}
