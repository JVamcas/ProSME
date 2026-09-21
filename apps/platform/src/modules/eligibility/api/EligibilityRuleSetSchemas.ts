import { z } from "zod";

import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";
import {
  eligibilityExecutionModes,
  eligibilityFailureTypes,
} from "../domain/EligibilityRule";

const rulesetCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

const reasonCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const eligibilityRuleSetCreateSchema = z.object({
  code: rulesetCodeSchema,
  description: z.string().trim().max(1000),
  name: z.string().trim().min(2).max(160),
});

export const eligibilityBuilderRuleSchema = z.object({
  applicantMessage: z.string().trim().min(1).max(1000),
  condition: conditionGroupSchema,
  executionMode: z.enum(eligibilityExecutionModes),
  failureType: z.enum(eligibilityFailureTypes),
  id: z.string().uuid(),
  order: z.number().int().positive(),
  reasonCode: reasonCodeSchema,
}).superRefine((rule, context) => {
  function containsEmptyGroup(node: typeof rule.condition): boolean {
    return node.children.length === 0 || node.children.some((child) =>
      child.kind === "GROUP" && containsEmptyGroup(child)
    );
  }
  if (containsEmptyGroup(rule.condition)) {
    context.addIssue({
      code: "custom",
      message: "Condition groups must contain at least one condition.",
      path: ["condition"],
    });
  }
});

export const eligibilityRuleSetBuilderSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
  rules: z.array(eligibilityBuilderRuleSchema).max(100),
}).superRefine((value, context) => {
  const reasonCodes = value.rules.map((rule) => rule.reasonCode);
  if (new Set(reasonCodes).size !== reasonCodes.length) {
    context.addIssue({
      code: "custom",
      message: "Reason codes must be unique within a ruleset version.",
      path: ["rules"],
    });
  }
  const orders = value.rules
    .map((rule) => rule.order)
    .sort((left, right) => left - right);
  if (orders.some((order, index) => order !== index + 1)) {
    context.addIssue({
      code: "custom",
      message: "Rule order must be contiguous and start at one.",
      path: ["rules"],
    });
  }
});

export const eligibilityRuleSetListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const eligibilityRuleSetLifecycleSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("CLONE"),
      sourceVersionId: z.string().uuid(),
    }),
    z.object({
      action: z.enum(["PUBLISH", "RETIRE"]),
      expectedRowVersion: z.number().int().positive(),
      versionId: z.string().uuid(),
    }),
  ],
);

export type EligibilityRuleSetListInput = z.infer<
  typeof eligibilityRuleSetListSchema
>;
