import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/EligibilityAssessmentRepository", () => ({
  createOwnedEligibilityAssessment: vi.fn(),
  listOwnedEligibilityAssessments: vi.fn(),
}));
vi.mock("@/modules/eligibility/ServerEligibilityIntegration", () => ({
  loadPublishedEligibilityRuleSet: vi.fn(),
}));
vi.mock("@/modules/funding-calls/ServerFundingOpportunityIntegration", () => ({
  findPublishedFundingOpportunity: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createOwnedEligibilityAssessment,
  listOwnedEligibilityAssessments,
} from "@/db/repositories/EligibilityAssessmentRepository";
import {
  EligibilityRulesChangedError,
  createEligibilityAssessment,
  getEligibilityWorkspace,
} from "@/modules/eligibility/ServerEligibilityService";
import { loadPublishedEligibilityRuleSet } from "@/modules/eligibility/ServerEligibilityIntegration";
import { findPublishedFundingOpportunity } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";

const ownerId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const fundingOpportunityId = "00000000-0000-4000-8000-000000000042";
const rules = [
  { hardStop: true, help: "Core requirement", id: "ownership", question: "Namibian owned?" },
  { hardStop: false, help: "Can be resolved", id: "bank", question: "Bank account?" },
];

function user(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Anna Ndeitunga",
    email: "owner@example.test",
    id: ownerId,
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findPublishedFundingOpportunity).mockResolvedValue({
    id: fundingOpportunityId,
    status: "open",
    title: "Growth Fund",
  } as never);
  vi.mocked(loadPublishedEligibilityRuleSet).mockResolvedValue({
    rules,
    version: "v1",
  });
  vi.mocked(listOwnedEligibilityAssessments).mockResolvedValue([]);
});

describe("eligibility assessment service", () => {
  it("scopes prior assessments to the authenticated owner and opportunity", async () => {
    await getEligibilityWorkspace(
      user([permissionCodes.fundingCallEligibilityOwnRead]),
      fundingOpportunityId,
    );
    expect(listOwnedEligibilityAssessments).toHaveBeenCalledWith(
      ownerId,
      fundingOpportunityId,
    );
  });

  it("persists the exact rule version, snapshot, answers and server outcome", async () => {
    vi.mocked(createOwnedEligibilityAssessment).mockImplementation(async (input) => ({
      ...input,
      createdAt: new Date("2026-09-13T10:00:00.000Z"),
      id: "assessment-id",
      ruleSnapshot: input.rules,
    }));
    const result = await createEligibilityAssessment(
      user([permissionCodes.fundingCallEligibilityCreate]),
      {
        answers: { bank: "no", ownership: "yes" },
        expectedRuleSetVersion: "v1",
        fundingOpportunityId,
      },
    );

    expect(result.outcome).toBe("action-required");
    expect(createOwnedEligibilityAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: { bank: "no", ownership: "yes" },
        outcome: "action-required",
        ownerUserId: ownerId,
        rules,
        ruleSetVersion: "v1",
      }),
    );
  });

  it("rejects a stale rule-set version without writing", async () => {
    await expect(createEligibilityAssessment(
      user([permissionCodes.fundingCallEligibilityCreate]),
      {
        answers: { bank: "yes", ownership: "yes" },
        expectedRuleSetVersion: "old-version",
        fundingOpportunityId,
      },
    )).rejects.toBeInstanceOf(EligibilityRulesChangedError);
    expect(createOwnedEligibilityAssessment).not.toHaveBeenCalled();
  });

  it("rejects creating an assessment without the capability", async () => {
    await expect(createEligibilityAssessment(
      user([permissionCodes.fundingCallEligibilityOwnRead]),
      {
        answers: { bank: "yes", ownership: "yes" },
        expectedRuleSetVersion: "v1",
        fundingOpportunityId,
      },
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findPublishedFundingOpportunity).not.toHaveBeenCalled();
  });
});
