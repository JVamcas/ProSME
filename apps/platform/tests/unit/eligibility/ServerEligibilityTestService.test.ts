import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findTestableEligibilityRuleSetForEvaluation: vi.fn(),
}));
vi.mock("@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration", () => ({
  resolveEligibilityTestFundingCall: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityInputRepository", () => ({
  listEligibilityInputs: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { EligibilityTestInput } from "@/modules/eligibility/api/EligibilityTestSchemas";
import { testEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityTestService";
import { findTestableEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { resolveEligibilityTestFundingCall } from "@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration";
import { listEligibilityInputs } from "@/modules/eligibility/infrastructure/EligibilityInputRepository";

const ruleSetId = "80000000-0000-4000-8000-000000000001";
const versionId = "80000000-0000-4000-8000-000000000002";
const fundingCallId = "80000000-0000-4000-8000-000000000004";

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Eligibility tester",
    email: "tester@example.test",
    id: "80000000-0000-4000-8000-000000000003",
    identitySubject: "eligibility-tester",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

const input: EligibilityTestInput = {
  fundingCallId,
  mode: "SCREENING",
  values: {
    eligibility: {},
  },
  versionId,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findTestableEligibilityRuleSetForEvaluation).mockResolvedValue({
    ruleSetId,
    rules: [],
    versionId,
    versionNumber: 2,
  });
  vi.mocked(resolveEligibilityTestFundingCall).mockResolvedValue({
    closesAt: new Date("2026-12-31T00:00:00.000Z"),
    eligibilityRuleSetVersionId: versionId,
    fundingInstrument: "Grant",
    maximumGrantAmount: "200000",
    minimumGrantAmount: "1000",
    opensAt: new Date("2026-01-01T00:00:00.000Z"),
    thematicArea: "Growth",
    totalBudgetEnvelope: "1000000",
  } as never);
  vi.mocked(listEligibilityInputs).mockResolvedValue([]);
});

describe("ServerEligibilityTestService", () => {
  it("runs a non-authoritative test with the read permission", async () => {
    const result = await testEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetRead]),
      ruleSetId,
      input,
    );

    expect(findTestableEligibilityRuleSetForEvaluation)
      .toHaveBeenCalledWith(versionId);
    expect(result).toMatchObject({
      authoritative: false,
      eligible: true,
      mode: "SCREENING",
      ruleSetVersionId: versionId,
    });
  });

  it("denies tests without the canonical read permission", async () => {
    await expect(testEligibilityRuleSet(user([]), ruleSetId, input))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findTestableEligibilityRuleSetForEvaluation).not.toHaveBeenCalled();
  });

  it("rejects versions that do not belong to the requested ruleset", async () => {
    vi.mocked(findTestableEligibilityRuleSetForEvaluation).mockResolvedValue({
      ruleSetId: "80000000-0000-4000-8000-000000000099",
      rules: [],
      versionId,
      versionNumber: 1,
    });

    await expect(testEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetRead]),
      ruleSetId,
      input,
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
