import { z } from "zod";

import { eligibilityQuestionInputTypes } from "../domain/EligibilityQuestion";

export const eligibilityQuestionInputSchema = z.object({
  applicantLabel: z.string().trim().min(2).max(500),
  code: z.string().trim().min(2).max(100)
    .regex(/^[A-Z][A-Z0-9_]*$/),
  inputType: z.enum(eligibilityQuestionInputTypes),
  reviewerLabel: z.string().trim().min(2).max(500),
});

export const eligibilityQuestionUpdateSchema = eligibilityQuestionInputSchema
  .extend({ expectedRowVersion: z.number().int().positive() });

export const eligibilityQuestionListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type EligibilityQuestionInput = z.infer<
  typeof eligibilityQuestionInputSchema
>;
export type EligibilityQuestionUpdateInput = z.infer<
  typeof eligibilityQuestionUpdateSchema
>;
export type EligibilityQuestionListInput = z.infer<
  typeof eligibilityQuestionListSchema
>;
