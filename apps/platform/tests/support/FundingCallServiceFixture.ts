import type { AuthenticatedUser } from "@/auth/types";

export const actorId = "10000000-0000-4000-8000-000000000001";
export const callId = "00000000-0000-4000-8000-000000000042";
export const formVersionId = "20000000-0000-4000-8000-000000000001";
export const eligibilityRuleSetVersionId = "30000000-0000-4000-8000-000000000001";
export const workflowTemplateVersionId = "40000000-0000-4000-8000-000000000001";
export const input = {
  allowResubmissionAfterWithdrawal: false,
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: "2027-03-31T15:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilitySummary: "Registered Namibian SMEs may qualify.",
  eligibilityRuleSetVersionId,
  formVersionId,
  fundingInstrument: "Grant",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: null,
  reference: "SME Fund-2027-01",
  slug: "sme-growth-fund-2027",
  thematicArea: "Business growth",
  title: "SME Fund Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  workflowTemplateVersionId,
};
export const stored = {
  ...input,
  closesAt: new Date(input.closesAt),
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  createdBy: actorId,
  id: callId,
  opensAt: new Date(input.opensAt),
  rowVersion: 1,
  status: "DRAFT" as const,
  suspendedFromStatus: null,
  updatedAt: new Date("2026-09-20T08:00:00.000Z"),
  updatedBy: actorId,
};
export function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Funding administrator",
    email: "funding-admin@example.test",
    id: actorId,
    identitySubject: "funding-admin-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}
