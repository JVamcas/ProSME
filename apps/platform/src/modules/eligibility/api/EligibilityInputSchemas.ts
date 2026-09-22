import { z } from "zod";

import {
  conditionFieldTypes,
  type ConditionFieldType,
} from "@/modules/conditions/domain/ConditionConfiguration";
import {
  eligibilityInputModes,
  eligibilityScreeningSourceKinds,
  selfCheckAnswerTypes,
  type SelfCheckAnswerType,
} from "../domain/EligibilityInputDefinition";

const stableKeySchema = z.string().trim().min(2).max(100).regex(
  /^[a-z][a-z0-9_]*$/,
  "Use a lowercase stable key containing only letters, numbers and underscores.",
);

const optionalMetadataSchema = z.string().trim().max(1000).default("");

export const selfCheckQuestionSchema = z.object({
  answerType: z.enum(selfCheckAnswerTypes),
  explanation: optionalMetadataSchema,
  helpText: optionalMetadataSchema,
  options: z.array(z.object({
    description: z.string().trim().max(500).optional(),
    label: z.string().trim().min(1).max(160),
    value: z.string().trim().min(1).max(100),
  }).strict()).max(100).default([]),
  prompt: z.string().trim().min(1).max(500),
  required: z.boolean(),
}).strict().superRefine((question, context) => {
  const select = question.answerType === "SINGLE_SELECT"
    || question.answerType === "MULTI_SELECT";
  if (select && question.options.length < 2) {
    context.addIssue({
      code: "custom",
      message: "Select questions require at least two options.",
      path: ["options"],
    });
  }
  if (!select && question.options.length) {
    context.addIssue({
      code: "custom",
      message: "Only select questions may define options.",
      path: ["options"],
    });
  }
  const values = question.options.map((option) => option.value);
  if (new Set(values).size !== values.length) {
    context.addIssue({
      code: "custom",
      message: "Question option values must be unique.",
      path: ["options"],
    });
  }
});

const answerTypesByInputType: Record<
  ConditionFieldType,
  readonly SelfCheckAnswerType[]
> = {
  BOOLEAN: ["BOOLEAN"],
  DATE: ["DATE"],
  NUMBER: ["NUMBER", "PERCENTAGE"],
  TEXT: ["TEXT", "YES_NO_NA", "SINGLE_SELECT", "MULTI_SELECT"],
} as const;

export const eligibilitySourceBindingSchema = z.object({
  sourceDefinitionId: z.string().uuid(),
  sourceKey: z.string().trim().min(1).max(200),
  sourceKind: z.enum(eligibilityScreeningSourceKinds),
  sourceVersionId: z.string().uuid().nullable(),
  valuePath: z.string().trim().min(1).max(300),
}).strict().superRefine((binding, context) => {
  if (
    binding.sourceKind !== "FUNDING_CALL_FIELD"
    && binding.sourceVersionId === null
  ) {
    context.addIssue({
      code: "custom",
      message: "This Screening source requires an exact source version.",
      path: ["sourceVersionId"],
    });
  }
  if (
    binding.sourceKind === "FUNDING_CALL_FIELD"
    && binding.sourceVersionId !== null
  ) {
    context.addIssue({
      code: "custom",
      message: "Funding Call fields bind to the Funding Call definition itself.",
      path: ["sourceVersionId"],
    });
  }
  if (
    binding.sourceKind === "INTEGRATION_OUTPUT"
    && binding.valuePath !== "value"
  ) {
    context.addIssue({
      code: "custom",
      message: "Integration outputs use the normalized value path.",
      path: ["valuePath"],
    });
  }
});

const eligibilityInputDefinitionFields = {
  availableIn: z.array(z.enum(eligibilityInputModes)).min(1).max(2),
  groupKey: z.string().trim().min(1).max(100).nullable(),
  groupLabel: z.string().trim().min(1).max(160).nullable(),
  label: z.string().trim().min(1).max(160),
  order: z.number().int().positive(),
  screening: eligibilitySourceBindingSchema.nullable(),
  selfCheck: selfCheckQuestionSchema.nullable(),
  stableKey: stableKeySchema,
  type: z.enum(conditionFieldTypes),
};

function validateModeBindings(
  input: {
    availableIn: Array<"SELF_CHECK" | "SCREENING">;
    groupKey: string | null;
    groupLabel: string | null;
    screening: unknown | null;
    selfCheck: { answerType: SelfCheckAnswerType } | null;
    type: ConditionFieldType;
  },
  context: z.RefinementCtx,
) {
  if (new Set(input.availableIn).size !== input.availableIn.length) {
    context.addIssue({
      code: "custom",
      message: "Execution modes must be unique.",
      path: ["availableIn"],
    });
  }
  const selfCheck = input.availableIn.includes("SELF_CHECK");
  const screening = input.availableIn.includes("SCREENING");
  if (selfCheck !== Boolean(input.selfCheck)) {
    context.addIssue({
      code: "custom",
      message: "Self Check availability and question configuration must match.",
      path: ["selfCheck"],
    });
  }
  if (
    input.selfCheck
    && !answerTypesByInputType[input.type].includes(input.selfCheck.answerType)
  ) {
    context.addIssue({
      code: "custom",
      message: "The Self Check answer type must match the input data type.",
      path: ["selfCheck", "answerType"],
    });
  }
  if (screening !== Boolean(input.screening)) {
    context.addIssue({
      code: "custom",
      message: "Screening availability and source binding must match.",
      path: ["screening"],
    });
  }
  if ((input.groupKey === null) !== (input.groupLabel === null)) {
    context.addIssue({
      code: "custom",
      message: "Input group key and label must be supplied together.",
      path: ["groupKey"],
    });
  }
}

export const eligibilityInputCreateSchema = z.object({
  ...eligibilityInputDefinitionFields,
  expectedRowVersion: z.number().int().positive(),
}).strict().superRefine(validateModeBindings);

export const eligibilityInputUpdateSchema = eligibilityInputCreateSchema;

export const eligibilityInputDeleteSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
}).strict();

export type EligibilityInputCreateInput = z.infer<
  typeof eligibilityInputCreateSchema
>;
export type EligibilityInputUpdateInput = z.infer<
  typeof eligibilityInputUpdateSchema
>;
