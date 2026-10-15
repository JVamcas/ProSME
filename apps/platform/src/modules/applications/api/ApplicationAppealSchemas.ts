import { z } from "zod";
import { richTextToPlainText } from "@/shared/utils/RichText";

export const appealTextLimit = 1000;
const appealRichText = z
  .string()
  .max(30_000)
  .refine(
    (value) => richTextToPlainText(value).length > 0,
    "Please enter appeal text.",
  )
  .refine(
    (value) => richTextToPlainText(value).length <= appealTextLimit,
    "Use no more than 1,000 characters of text.",
  );
export const applicationAppealSchema = z
  .object({
    applicationReference: z.string().trim().min(1).max(100).toUpperCase(),
    grounds: appealRichText,
    details: appealRichText,
    consent: z.boolean().refine(Boolean, "Consent is required."),
    company: z.string().max(0),
  })
  .strict();
export type ApplicationAppealInput = z.infer<typeof applicationAppealSchema>;
export const appealAssignmentSchema = z
  .object({
    assignedTo: z.uuid().nullable(),
    expectedRowVersion: z.number().int().positive(),
  })
  .strict();
export const appealResolutionSchema = z
  .object({
    resolutionNote: z
      .string()
      .trim()
      .min(1, "A resolution note is required.")
      .max(2000),
    expectedRowVersion: z.number().int().positive(),
  })
  .strict();
export const appealQueueSchema = z
  .object({
    after: z.iso.datetime().optional(),
    afterId: z.uuid().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.after) === Boolean(value.afterId), {
    message: "Both cursor fields are required.",
  });
