import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/applications/ServerApplicationEligibilityIntegration",
  () => ({ resolveApplicationEligibilityRuleSetBinding: vi.fn() }),
);
vi.mock(
  "@/modules/funding-calls/ServerFundingOpportunityIntegration",
  () => ({ resolvePublishedEligibilityRuleSetBinding: vi.fn() }),
);
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findRuntimeEligibilityRuleSetForEvaluation: vi.fn(),
}));

import { resolveApplicationEligibilityRuleSetBinding } from "@/modules/applications/ServerApplicationEligibilityIntegration";
import {
  resolveScreeningEligibilityRuleSet,
  resolveSelfCheckEligibilityRuleSet,
} from "@/modules/eligibility/application/ServerEligibilityBindingService";
import { findRuntimeEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { resolvePublishedEligibilityRuleSetBinding } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";

const versionId = "30000000-0000-4000-8000-000000000001";
const ruleSet = { versionId };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findRuntimeEligibilityRuleSetForEvaluation)
    .mockResolvedValue(ruleSet as never);
});

describe("bound eligibility ruleset resolution", () => {
  it("resolves self-check from the funding call binding", async () => {
    vi.mocked(resolvePublishedEligibilityRuleSetBinding).mockResolvedValue({
      eligibilityRuleSetVersionId: versionId,
    } as never);

    await expect(resolveSelfCheckEligibilityRuleSet("funding-call"))
      .resolves.toBe(ruleSet);
    expect(findRuntimeEligibilityRuleSetForEvaluation)
      .toHaveBeenCalledWith(versionId);
  });

  it("resolves screening from the version retained by the application", async () => {
    vi.mocked(resolveApplicationEligibilityRuleSetBinding).mockResolvedValue({
      eligibilityRuleSetVersionId: versionId,
    } as never);

    await expect(resolveScreeningEligibilityRuleSet("application"))
      .resolves.toBe(ruleSet);
    expect(findRuntimeEligibilityRuleSetForEvaluation)
      .toHaveBeenCalledWith(versionId);
  });
});
