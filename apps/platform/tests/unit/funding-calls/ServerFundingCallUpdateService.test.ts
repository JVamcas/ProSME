import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  formVersionIsBindable: vi.fn(async () => true),
  getConfigurableFormFields: vi.fn(async () => []),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetRepository", () => ({
  eligibilityRuleSetVersionIsBindable: vi.fn(async () => true),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findTestableEligibilityRuleSetForEvaluation: vi.fn(async () => ({
    ruleSetId: "30000000-0000-4000-8000-000000000002",
    rules: [],
    versionId: "30000000-0000-4000-8000-000000000001",
    versionNumber: 1,
  })),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityInputRepository", () => ({
  listEligibilityInputs: vi.fn(async () => []),
}));
vi.mock("@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration", () => ({
  resolveEligibilityRuleSetContexts: vi.fn(async () => []),
  resolveFundingCallEligibilityContext: vi.fn(async () => ({ sources: [] })),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  workflowTemplateVersionIsBindable: vi.fn(async () => true),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
  updateDraftFundingCall: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { updateFundingCall } from "@/modules/funding-calls/application/ServerFundingCallService";
import {
  readFundingCallById,
  updateDraftFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const input = {
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: "2027-03-31T15:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilitySummary: "Registered Namibian SMEs may qualify.",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  expectedRowVersion: 1,
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingInstrument: "Grant",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: null,
  reference: "SME-2027-01",
  slug: "sme-growth-fund-2027",
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
};
const stored = {
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

function user(grants: string[]): AuthenticatedUser {
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallById).mockResolvedValue(stored);
});

describe("ServerFundingCallService draft updates", () => {
  it("denies draft edits without the canonical create permission", async () => {
    await expect(updateFundingCall(
      user([permissionCodes.fundingCallRead]),
      callId,
      input,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(updateDraftFundingCall).not.toHaveBeenCalled();
  });

  it("uses the create permission to edit a draft", async () => {
    vi.mocked(updateDraftFundingCall).mockResolvedValue({
      ...stored,
      rowVersion: 2,
    });

    const result = await updateFundingCall(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      input,
    );

    expect(updateDraftFundingCall).toHaveBeenCalledWith(
      actorId,
      callId,
      input,
    );
    expect(result.rowVersion).toBe(2);
  });
});
