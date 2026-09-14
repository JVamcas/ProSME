import { z } from "zod";

export const applicationDeclarationsSectionSchema = z.object({
  compliance: z.boolean().refine(Boolean, {
    error: "Confirm that the business complies with applicable laws",
  }),
  falseInformation: z.boolean().refine(Boolean, {
    error: "Acknowledge the consequence of providing false information",
  }),
  informationAccuracy: z.boolean().refine(Boolean, {
    error: "Confirm that the information provided is true and correct",
  }),
  privacyConsent: z.boolean().refine(Boolean, {
    error: "Consent to the processing of personal and business information",
  }),
  terms: z.boolean().refine(Boolean, {
    error: "Accept the SME Fund terms and conditions",
  }),
});

export const partialDeclarationsSectionSchema = z.object({
  compliance: z.boolean().optional(),
  falseInformation: z.boolean().optional(),
  informationAccuracy: z.boolean().optional(),
  privacyConsent: z.boolean().optional(),
  terms: z.boolean().optional(),
});

export type ApplicationDeclarationsSection = z.infer<
  typeof applicationDeclarationsSectionSchema
>;
