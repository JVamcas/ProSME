import { z } from "zod";

import { applicantGenders } from "@/modules/profiles/ProfileOptions";

import { adminApplicationStatuses } from "../ApplicationTypes";

const optionalAge = z.union([
  z.number(),
  z.string().regex(/^$|^\d+$/, "Use a whole number for age"),
])
  .optional()
  .transform((value) => {
    if (value === "" || value === undefined) return undefined;
    return Number(value);
  })
  .pipe(z.number().int().min(0).max(150).optional());

const optionalDate = z.string().optional().refine((value) => {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(date.valueOf())
    && date.toISOString().slice(0, 10) === value;
}, "Use a valid date");

export const adminApplicationFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  stage: z.string().trim().max(160).optional(),
  status: z.enum(adminApplicationStatuses),
  ageMin: optionalAge,
  ageMax: optionalAge,
  gender: z.union([z.enum(applicantGenders), z.literal("")]).optional(),
  region: z.string().trim().max(80).optional(),
  sector: z.string().trim().max(120).optional(),
  submittedAfter: z.iso.datetime({ offset: true }).optional(),
  submittedBefore: z.iso.datetime({ offset: true }).optional(),
  submittedFrom: optionalDate,
  submittedTo: optionalDate,
});

function validateRanges(
  input: z.output<typeof adminApplicationFilterSchema>,
  context: z.RefinementCtx,
) {
  if (input.submittedAfter && input.submittedBefore
    && new Date(input.submittedAfter) > new Date(input.submittedBefore)) {
    context.addIssue({
      code: "custom",
      path: ["submittedBefore"],
      message: "Reporting period end must be on or after its start",
    });
  }
  if (input.ageMin !== undefined && input.ageMax !== undefined
    && input.ageMin > input.ageMax) {
    context.addIssue({
      code: "custom",
      path: ["ageMax"],
      message: "Maximum age must be at least the minimum age",
    });
  }
  if (input.submittedFrom && input.submittedTo
    && input.submittedFrom > input.submittedTo) {
    context.addIssue({
      code: "custom",
      path: ["submittedTo"],
      message: "End date must be on or after the start date",
    });
  }
}

export const adminApplicationFormSchema = adminApplicationFilterSchema
  .superRefine(validateRanges);

export const adminApplicationListSchema = adminApplicationFilterSchema.extend({
  status: z.enum(adminApplicationStatuses).default("all"),
  after: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).superRefine(validateRanges);
