import { z } from "zod";

import { richTextToPlainText } from "@/shared/utils/RichText";

const moneySchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,16}(\.\d{1,2})?$/,
    "Enter a non-negative amount with up to two decimals.",
  );

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null)
    .nullable();

const optionalVersionId = z
  .union([z.literal(""), z.uuid(), z.null()])
  .transform((value) => value || null)
  .default(null);

export const fundingCallDescriptionSchema = z
  .string()
  .trim()
  .max(5000)
  .refine((value) => richTextToPlainText(value).length > 0, {
    message: "Description is required.",
  });

const fundingCallFields = {
  closesAt: z.iso.datetime({ offset: true }),
  description: fundingCallDescriptionSchema,
  eligibilitySummary: optionalText(2000).default(null),
  eligibilityRuleSetVersionId: optionalVersionId,
  formVersionId: optionalVersionId,
  fundingInstrument: optionalText(160),
  maximumGrantAmount: moneySchema,
  minimumGrantAmount: moneySchema,
  opensAt: z.iso.datetime({ offset: true }),
  publicContactEmail: z
    .union([z.literal(""), z.email().max(254), z.null()])
    .transform((value) => value || null),
  publicContactName: optionalText(160),
  publicContactPhone: optionalText(40),
  reference: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Z0-9][A-Z0-9_-]*$/),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  thematicArea: optionalText(160),
  title: z.string().trim().min(2).max(240),
  totalBudgetEnvelope: moneySchema,
  workflowTemplateVersionId: optionalVersionId,
};

function validateRange(
  value: {
    closesAt: string;
    maximumGrantAmount: string;
    minimumGrantAmount: string;
    opensAt: string;
    totalBudgetEnvelope: string;
  },
  context: z.RefinementCtx,
) {
  if (Date.parse(value.closesAt) <= Date.parse(value.opensAt)) {
    context.addIssue({
      code: "custom",
      message: "Closing date must be after opening date.",
      path: ["closesAt"],
    });
  }
  if (Number(value.maximumGrantAmount) < Number(value.minimumGrantAmount)) {
    context.addIssue({
      code: "custom",
      message: "Maximum grant must be at least the minimum grant.",
      path: ["maximumGrantAmount"],
    });
  }
  if (Number(value.totalBudgetEnvelope) < Number(value.maximumGrantAmount)) {
    context.addIssue({
      code: "custom",
      message: "Budget envelope must cover the maximum grant.",
      path: ["totalBudgetEnvelope"],
    });
  }
}

export const fundingCallCreateSchema = z
  .object(fundingCallFields)
  .superRefine(validateRange);

export const fundingCallUpdateSchema = z
  .object({
    ...fundingCallFields,
    expectedRowVersion: z.number().int().positive(),
  })
  .superRefine(validateRange);

export const fundingCallListSchema = z.object({
  fundingCallId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const fundingCallPublishSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
});

export const fundingCallGovernanceCommandSchema = z.discriminatedUnion(
  "command",
  [
    z.object({
      command: z.literal("SUBMIT_FOR_APPROVAL"),
      expectedRowVersion: z.number().int().positive(),
    }),
    z.object({
      command: z.literal("APPROVE"),
      expectedRowVersion: z.number().int().positive(),
    }),
    z.object({
      command: z.literal("RETURN_FOR_AMENDMENT"),
      expectedRowVersion: z.number().int().positive(),
      reason: z.string().trim().min(1).max(1000),
    }),
    z.object({
      command: z.literal("WITHDRAW_APPROVAL_REQUEST"),
      expectedRowVersion: z.number().int().positive(),
    }),
  ],
);

export type FundingCallCreateInput = z.infer<typeof fundingCallCreateSchema>;
export type FundingCallUpdateInput = z.infer<typeof fundingCallUpdateSchema>;
export type FundingCallListInput = z.infer<typeof fundingCallListSchema>;
export type FundingCallPublishInput = z.infer<typeof fundingCallPublishSchema>;
export type FundingCallGovernanceCommandInput = z.infer<
  typeof fundingCallGovernanceCommandSchema
>;
