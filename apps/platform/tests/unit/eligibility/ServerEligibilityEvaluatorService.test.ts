import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findPublishedEligibilityRuleSetForEvaluation: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { evaluatePublishedEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityEvaluatorService";
import { findPublishedEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";

const versionId = "30000000-0000-4000-8000-000000000001";
const data = { application: {}, fundingCall: {}, stages: [] };

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Eligibility evaluator",
    email: "evaluator@example.test",
    id: "30000000-0000-4000-8000-000000000002",
    identitySubject: "evaluator-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("ServerEligibilityEvaluatorService", () => {
  it("evaluates the exact published version for authorized readers", async () => {
    vi.mocked(findPublishedEligibilityRuleSetForEvaluation).mockResolvedValue({
      ruleSetId: "30000000-0000-4000-8000-000000000003",
      rules: [],
      versionId,
      versionNumber: 2,
    });

    const result = await evaluatePublishedEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetRead]),
      versionId,
      "SCREENING",
      data,
    );

    expect(findPublishedEligibilityRuleSetForEvaluation)
      .toHaveBeenCalledWith(versionId);
    expect(result).toMatchObject({
      eligible: true,
      mode: "SCREENING",
      ruleSetVersionId: versionId,
      ruleSetVersionNumber: 2,
    });
  });

  it("denies evaluation without the canonical read permission", async () => {
    await expect(evaluatePublishedEligibilityRuleSet(
      user([]),
      versionId,
      "SELF_CHECK",
      data,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findPublishedEligibilityRuleSetForEvaluation).not.toHaveBeenCalled();
  });

  it("rejects draft, retired, and missing versions as unpublished", async () => {
    vi.mocked(findPublishedEligibilityRuleSetForEvaluation)
      .mockResolvedValue(null);

    await expect(evaluatePublishedEligibilityRuleSet(
      user([permissionCodes.eligibilityRuleSetRead]),
      versionId,
      "SELF_CHECK",
      data,
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
