import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/EligibilityAssessmentRepository", () => ({
  createOwnedEligibilityAssessment: vi.fn(),
  listOwnedEligibilityAssessments: vi.fn(),
}));
vi.mock("@/modules/eligibility/ServerEligibilityIntegration", () => ({
  loadPublishedEligibilityRuleSet: vi.fn(),
}));
vi.mock("@/modules/funding-opportunities/ServerFundingOpportunityIntegration", () => ({
  findPublishedFundingOpportunity: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
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
import { findPublishedFundingOpportunity } from "@/modules/funding-opportunities/ServerFundingOpportunityIntegration";

const ownerId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
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
    id: 42,
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
      user([capabilities.eligibilityReadOwn]),
      42,
    );
    expect(listOwnedEligibilityAssessments).toHaveBeenCalledWith(ownerId, 42);
  });

  it("persists the exact rule version, snapshot, answers and server outcome", async () => {
    vi.mocked(createOwnedEligibilityAssessment).mockImplementation(async (input) => ({
      ...input,
      createdAt: new Date("2026-09-13T10:00:00.000Z"),
      id: "assessment-id",
      ruleSnapshot: input.rules,
    }));
    const result = await createEligibilityAssessment(
      user([capabilities.eligibilityCreate]),
      {
        answers: { bank: "no", ownership: "yes" },
        expectedRuleSetVersion: "v1",
        fundingOpportunityId: 42,
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
      user([capabilities.eligibilityCreate]),
      {
        answers: { bank: "yes", ownership: "yes" },
        expectedRuleSetVersion: "old-version",
        fundingOpportunityId: 42,
      },
    )).rejects.toBeInstanceOf(EligibilityRulesChangedError);
    expect(createOwnedEligibilityAssessment).not.toHaveBeenCalled();
  });

  it("rejects creating an assessment without the capability", async () => {
    await expect(createEligibilityAssessment(
      user([capabilities.eligibilityReadOwn]),
      {
        answers: { bank: "yes", ownership: "yes" },
        expectedRuleSetVersion: "v1",
        fundingOpportunityId: 42,
      },
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findPublishedFundingOpportunity).not.toHaveBeenCalled();
  });
});

