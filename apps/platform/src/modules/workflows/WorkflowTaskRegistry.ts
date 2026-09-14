import { z } from "zod";

import type { TaskTypeCode } from "./WorkflowTypes";

const optionSchema = z.object({ code: z.string().min(1), label: z.string().min(1) });
const itemSchema = optionSchema.extend({ required: z.boolean().default(true) });
const fieldSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text", "textarea", "integer", "decimal", "currency", "date",
    "single-select", "multi-select", "checkbox", "calculated-display",
  ]),
  required: z.boolean().default(false),
  options: z.array(optionSchema).optional(),
});

const registry = {
  AUTOMATED_RULE_CHECK: {
    config: z.object({ rulesetCode: z.string().min(1), ruleVersion: z.number().int().positive(), inputs: z.array(z.string()).min(1), categories: z.array(optionSchema).min(1) }),
    result: z.object({ category: z.string().min(1), score: z.number().optional(), reasons: z.array(z.string()), ruleVersion: z.number().int().positive() }),
    rendererKey: "automated-rule-check",
    handlerKey: "evaluate-versioned-rules",
  },
  CHECKLIST: {
    config: z.object({ items: z.array(itemSchema).min(1) }),
    result: z.object({ items: z.array(z.object({ code: z.string(), accepted: z.boolean(), comment: z.string().optional() })) }),
    rendererKey: "checklist",
    handlerKey: "complete-checklist",
  },
  DOCUMENT_REVIEW: {
    config: z.object({ categories: z.array(optionSchema).min(1), outcomes: z.array(optionSchema).min(1) }),
    result: z.object({ decisions: z.array(z.object({ category: z.string(), outcome: z.string(), comment: z.string().optional() })) }),
    rendererKey: "document-review",
    handlerKey: "record-document-review",
  },
  STRUCTURED_FORM: {
    config: z.object({ fields: z.array(fieldSchema).min(1) }),
    result: z.object({ values: z.record(z.string(), z.unknown()) }),
    rendererKey: "structured-form",
    handlerKey: "save-structured-form",
  },
  ASSESSMENT_FORM: {
    config: z.object({ criteria: z.array(z.object({ code: z.string(), label: z.string(), maximumScore: z.number().positive(), weight: z.number().positive(), commentRequired: z.boolean().default(false) })).min(1) }),
    result: z.object({ scores: z.record(z.string(), z.number()), weightedTotal: z.number(), comments: z.record(z.string(), z.string()) }),
    rendererKey: "assessment-form",
    handlerKey: "score-assessment",
  },
  FINANCE_REVIEW: {
    config: z.object({ fields: z.array(fieldSchema).min(1), recommendations: z.array(optionSchema).min(1) }),
    result: z.object({ values: z.record(z.string(), z.unknown()), recommendation: z.string() }),
    rendererKey: "finance-review",
    handlerKey: "complete-finance-review",
  },
  INFORMATION_REQUEST: {
    config: z.object({ categories: z.array(optionSchema).min(1), responseRequired: z.boolean(), templateReference: z.string().min(1) }),
    result: z.object({ requestId: z.string().uuid(), outcome: z.string().min(1) }),
    rendererKey: "information-request",
    handlerKey: "manage-information-request",
  },
  RECOMMENDATION: {
    config: z.object({ options: z.array(optionSchema).min(1), rationaleRequired: z.boolean() }),
    result: z.object({ recommendation: z.string().min(1), rationale: z.string() }),
    rendererKey: "recommendation",
    handlerKey: "record-recommendation",
  },
  DECISION: {
    config: z.object({ outcomes: z.array(optionSchema).min(1), authorityCapability: z.string().min(1), rationaleRequired: z.boolean() }),
    result: z.object({ decision: z.string().min(1), rationale: z.string(), authoritySnapshot: z.string().min(1) }),
    rendererKey: "decision",
    handlerKey: "record-decision",
  },
  COMMUNICATION: {
    config: z.object({ template: z.string().min(1), channel: z.enum(["EMAIL", "IN_APP"]), audience: z.enum(["APPLICANT", "STAFF"]), trigger: z.string().min(1) }),
    result: z.object({ outboxId: z.string().uuid(), deliveryState: z.enum(["PENDING", "SENDING", "DELIVERED", "FAILED", "CANCELLED"]) }),
    rendererKey: "communication",
    handlerKey: "enqueue-communication",
  },
} satisfies Record<TaskTypeCode, {
  config: z.ZodType;
  result: z.ZodType;
  rendererKey: string;
  handlerKey: string;
}>;

export function getTaskRegistryEntry(type: TaskTypeCode) {
  return registry[type];
}

export function listTaskRegistryEntries() {
  return Object.entries(registry).map(([type, entry]) => ({
    type: type as TaskTypeCode,
    rendererKey: entry.rendererKey,
    handlerKey: entry.handlerKey,
  }));
}

export function validateTaskConfiguration(type: TaskTypeCode, config: unknown) {
  return registry[type].config.safeParse(config);
}

export function validateTaskResult(type: TaskTypeCode, result: unknown) {
  return registry[type].result.safeParse(result);
}
