import { z } from "zod";

export const eligibilityFailureStatuses = [
  "INELIGIBLE",
  "REJECTED",
  "REJECTED_INCOMPLETE",
] as const;

export const eligibilityFailureStatusSchema = z.enum(eligibilityFailureStatuses);

export type EligibilityFailureStatus = z.infer<typeof eligibilityFailureStatusSchema>;

export const eligibilityFailureStatusLabels = {
  INELIGIBLE: "Ineligible",
  REJECTED: "Rejected",
  REJECTED_INCOMPLETE: "Rejected — incomplete",
} as const;

export function eligibilityHardFailureStatus(config: unknown) {
  return z.object({
    // Published versions predating this setting use the client's default.
    hardFailureStatus: eligibilityFailureStatusSchema.default("INELIGIBLE"),
  }).parse(config).hardFailureStatus;
}
