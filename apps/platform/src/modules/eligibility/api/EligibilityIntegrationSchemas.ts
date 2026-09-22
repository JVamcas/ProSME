import { z } from "zod";

import { conditionFieldTypes } from "@/modules/conditions/domain/ConditionConfiguration";

const stableKey = z.string().trim().min(2).max(100).regex(
  /^[a-z][a-z0-9_]*$/,
  "Use lowercase letters, numbers and underscores.",
);

export const eligibilityIntegrationOutputSchema = z.object({
  description: z.string().trim().max(500).default(""),
  eligibleForScreening: z.boolean().default(true),
  key: stableKey,
  label: z.string().trim().min(1).max(160),
  type: z.enum(conditionFieldTypes),
}).strict();

const versionFields = {
  outputSchema: z.array(eligibilityIntegrationOutputSchema).min(1).max(100),
  rawResponsePolicy: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("DISCARD") }).strict(),
    z.object({
      kind: z.literal("RETAIN"),
      retentionDays: z.number().int().min(1).max(365),
    }).strict(),
  ]),
  retryPolicy: z.object({
    initialBackoffMs: z.number().int().min(0).max(60_000),
    maxAttempts: z.number().int().min(1).max(10),
    timeoutMs: z.number().int().min(100).max(120_000),
  }).strict(),
};

function uniqueOutputs(
  value: { outputSchema: Array<{ key: string }> },
  context: z.RefinementCtx,
) {
  const keys = value.outputSchema.map((output) => output.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: "custom",
      message: "Integration output keys must be unique.",
      path: ["outputSchema"],
    });
  }
}

export const eligibilityIntegrationCreateSchema = z.object({
  definition: z.object({
    description: z.string().trim().max(1000).default(""),
    name: z.string().trim().min(1).max(160),
    stableKey,
  }).strict(),
  version: z.object(versionFields).strict().superRefine(uniqueOutputs),
}).strict();

export const eligibilityIntegrationVersionCreateSchema = z.object(versionFields)
  .strict()
  .superRefine(uniqueOutputs);

export const eligibilityIntegrationBindingSchema = z.object({
  integrationVersionId: z.string().uuid(),
  manualFallbackAllowed: z.boolean(),
  providerAdapterKey: stableKey,
  providerDisplayName: z.string().trim().min(1).max(160),
  secretReference: z.string().trim().min(1).max(500).nullable(),
}).strict();

export const eligibilityIntegrationManualResultSchema = z.object({
  evidenceReference: z.string().trim().min(1).max(500),
  normalizedOutputs: z.record(z.string(), z.json()),
  status: z.enum(["SUCCEEDED", "NEGATIVE"]),
}).strict();

export type EligibilityIntegrationCreateInput = z.infer<
  typeof eligibilityIntegrationCreateSchema
>;
export type EligibilityIntegrationVersionCreateInput = z.infer<
  typeof eligibilityIntegrationVersionCreateSchema
>;
export type EligibilityIntegrationBindingInput = z.infer<
  typeof eligibilityIntegrationBindingSchema
>;
export type EligibilityIntegrationManualResultInput = z.infer<
  typeof eligibilityIntegrationManualResultSchema
>;
