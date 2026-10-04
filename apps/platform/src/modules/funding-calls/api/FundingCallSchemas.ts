import { z } from "zod";

import { richTextToPlainText } from "@/shared/utils/RichText";

export const fundingCallThumbnailMaximumBytes = 2 * 1024 * 1024;

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

export const fundingCallCreationStepSchema = z.enum([
  "basics",
  "funding",
  "schedule",
  "application",
  "eligibility",
  "workflow",
  "publicContent",
  "review",
]);

const progressVersionId = z.union([z.literal(""), z.uuid()]);

export const fundingCallCreationProgressValuesSchema = z
  .object({
    allowResubmissionAfterWithdrawal: z.boolean().default(false),
    applicationDuplicatePolicy: z.enum([
      "one_per_applicant",
      "one_per_business",
      "none",
    ]),
    closesAt: z.string().max(50),
    description: z.string().max(5000),
    eligibilitySummary: z.string().max(5000),
    eligibilityRuleSetVersionId: progressVersionId,
    formVersionId: progressVersionId,
    fundingInstrument: z.string().max(160),
    maximumGrantAmount: z.string().max(24),
    minimumGrantAmount: z.string().max(24),
    opensAt: z.string().max(50),
    publicContactEmail: z.string().max(254),
    publicContactName: z.string().max(160),
    publicContactPhone: z.string().max(40),
    thematicArea: z.string().max(160),
    title: z.string().max(240),
    totalBudgetEnvelope: z.string().max(24),
    workflowTemplateVersionId: progressVersionId,
  })
  .strict();

export const fundingCallCreationProgressSaveSchema = z
  .object({
    currentStep: fundingCallCreationStepSchema,
    expectedRowVersion: z.number().int().positive().nullable(),
    values: fundingCallCreationProgressValuesSchema,
  })
  .strict();

export const fundingCallDescriptionSchema = z
  .string()
  .trim()
  .max(5000)
  .refine((value) => richTextToPlainText(value).length > 0, {
    message: "Description is required.",
  });

export const fundingCallEligibilitySummarySchema = z
  .string()
  .trim()
  .max(5000)
  .refine((value) => richTextToPlainText(value).length <= 2000, {
    message: "Eligibility summary must contain at most 2000 characters.",
  });

const fundingCallFields = {
  allowResubmissionAfterWithdrawal: z.boolean().default(false),
  applicationDuplicatePolicy: z.enum([
    "one_per_applicant",
    "one_per_business",
    "none",
  ]).default("one_per_business"),
  closesAt: z.iso.datetime({ offset: true }),
  description: fundingCallDescriptionSchema,
  eligibilitySummary: fundingCallEligibilitySummarySchema
    .transform((value) => value || null)
    .nullable()
    .default(null),
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

export const fundingCallLifecycleCommandSchema = z.object({
  command: z.enum([
    "SUSPEND",
    "RESUME",
    "WITHDRAW",
    "WITHDRAW_FOR_AMENDMENT",
    "ARCHIVE",
  ]),
  expectedRowVersion: z.number().int().positive(),
  reason: z.string().trim().min(1).max(1000),
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
export type FundingCallCreationProgressSaveInput = z.infer<
  typeof fundingCallCreationProgressSaveSchema
>;
export type FundingCallCreationProgressValues = z.infer<
  typeof fundingCallCreationProgressValuesSchema
>;
export type FundingCallCreationStep = z.infer<typeof fundingCallCreationStepSchema>;
export type FundingCallUpdateInput = z.infer<typeof fundingCallUpdateSchema>;
export type FundingCallListInput = z.infer<typeof fundingCallListSchema>;
export type FundingCallPublishInput = z.infer<typeof fundingCallPublishSchema>;
export type FundingCallLifecycleCommandInput = z.infer<
  typeof fundingCallLifecycleCommandSchema
>;
export type FundingCallGovernanceCommandInput = z.infer<
  typeof fundingCallGovernanceCommandSchema
>;
