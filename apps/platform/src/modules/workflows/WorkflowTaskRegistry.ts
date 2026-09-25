import { z } from "zod";

import { fieldSchema, optionSchema } from "./WorkflowTaskSchemas";

export const checklistResultSchema = z.object({
  items: z.array(z.object({
    accepted: z.boolean(),
    code: z.string().min(1).max(80),
    comment: z.string().trim().max(1000).optional(),
  })).min(1).max(30),
});

export const eligibilityCommandSchema = z.object({
  command: z.literal("AUTHORITATIVE_ELIGIBILITY"),
  reevaluationPolicy: z.enum(["NEVER", "WHEN_EVIDENCE_CHANGED"]),
});

export const eligibilityResultSchema = z.object({
  eligible: z.boolean(),
  evaluationId: z.uuid(),
  evaluationNumber: z.number().int().positive(),
  hardFailureCount: z.number().int().nonnegative(),
  manualScreeningRequired: z.boolean(),
  outcome: z.enum(["ELIGIBLE", "INELIGIBLE"]).nullable(),
  softFailureCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
});

const criteriaSchema = z.array(z.object({
  code: z.string(),
  label: z.string(),
  maximumScore: z.number().positive(),
  weight: z.number().positive(),
  commentRequired: z.boolean().default(false),
})).min(1);

export const commentFieldSchema = z.object({
  key: z.string().min(2).max(80),
  label: z.string().min(2).max(160),
  helpText: z.string().max(1000),
  mandatory: z.boolean(),
  visibility: z.enum(["APPLICANT_VISIBLE", "INTERNAL_ONLY"]),
  displayOrder: z.number().int().positive(),
});

export const commentResultSchema = z.object({
  comments: z.array(z.object({
    key: z.string().min(2).max(80),
    value: z.string().trim().max(4000),
  })).max(100),
});

export function taskCommentFields(config: unknown) {
  const parsed = z.object({
    commentFields: z.array(commentFieldSchema).max(100).optional(),
  }).safeParse(config);
  return parsed.success ? parsed.data.commentFields ?? [] : [];
}

const taskConfigurationSchema = z.object({
  command: z.literal("AUTHORITATIVE_ELIGIBILITY").optional(),
  reevaluationPolicy: z.enum(["NEVER", "WHEN_EVIDENCE_CHANGED"]).optional(),
  categories: z.array(optionSchema).min(1).optional(),
  commentFields: z.array(commentFieldSchema).max(100).optional(),
  outcomes: z.array(optionSchema).min(1).optional(),
  fields: z.array(fieldSchema).min(1).optional(),
  criteria: criteriaSchema.optional(),
  recommendations: z.array(optionSchema).min(1).optional(),
  options: z.array(optionSchema).min(1).optional(),
  responseRequired: z.boolean().optional(),
  templateReference: z.string().min(1).optional(),
  rationaleRequired: z.boolean().optional(),
  authorityCapability: z.string().min(1).optional(),
  template: z.string().min(1).optional(),
  channel: z.enum(["EMAIL", "IN_APP"]).optional(),
  audience: z.enum(["APPLICANT", "STAFF"]).optional(),
  trigger: z.string().min(1).optional(),
}).passthrough().superRefine((config, context) => {
  if ("items" in config) {
    context.addIssue({
      code: "custom",
      message: "Assign checklist items from the checklist item form.",
      path: ["items"],
    });
  }
  if (config.command && !config.reevaluationPolicy) {
    context.addIssue({
      code: "custom",
      message: "Eligibility evaluation requires a reevaluation policy.",
      path: ["reevaluationPolicy"],
    });
  }
  if (config.reevaluationPolicy && !config.command) {
    context.addIssue({
      code: "custom",
      message: "A reevaluation policy requires an eligibility command.",
      path: ["command"],
    });
  }
});

export function validateTaskConfiguration(config: unknown) {
  return taskConfigurationSchema.safeParse(config);
}

export function taskRunsAuthoritativeEligibility(config: unknown): boolean {
  return eligibilityCommandSchema.safeParse(config).success;
}

export function validateChecklistResult(result: unknown) {
  return checklistResultSchema.safeParse(result);
}

export function validateEligibilityResult(result: unknown) {
  return eligibilityResultSchema.safeParse(result);
}

export function taskWorkIsReady(input: {
  config: unknown;
  formCompleted: boolean;
  formRequired: boolean;
  hasChecklist: boolean;
  result: unknown;
}) {
  if (input.formRequired && !input.formCompleted) return false;
  if (input.hasChecklist
    && !validateChecklistResult(input.result).success) return false;
  const fields = taskCommentFields(input.config);
  if (fields.length) {
    const parsed = commentResultSchema.safeParse(input.result);
    if (!parsed.success) return false;
    const answers = new Map(parsed.data.comments.map((item) => [item.key, item.value]));
    if (answers.size !== fields.length) return false;
    if (fields.some((field) => !answers.has(field.key)
      || (field.mandatory && !answers.get(field.key)))) return false;
  }
  if (taskRunsAuthoritativeEligibility(input.config)
    && !validateEligibilityResult(input.result).success) return false;
  return true;
}
