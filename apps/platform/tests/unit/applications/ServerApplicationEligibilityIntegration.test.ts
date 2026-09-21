import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/ApplicationRepository", () => ({
  readApplicationEligibilityBinding: vi.fn(),
}));

import { readApplicationEligibilityBinding } from "@/db/repositories/ApplicationRepository";
import { resolveApplicationEligibilityRuleSetBinding } from "@/modules/applications/ServerApplicationEligibilityIntegration";

const applicationId = "40000000-0000-4000-8000-000000000001";
const eligibilityRuleSetVersionId =
  "30000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("application eligibility ruleset binding", () => {
  it("resolves the version snapshotted when the application was created", async () => {
    vi.mocked(readApplicationEligibilityBinding).mockResolvedValue({
      eligibilityRuleSetVersionId,
      fundingOpportunityId: "00000000-0000-4000-8000-000000000042",
      id: applicationId,
    } as never);

    await expect(
      resolveApplicationEligibilityRuleSetBinding(applicationId),
    ).resolves.toMatchObject({ eligibilityRuleSetVersionId });
    expect(readApplicationEligibilityBinding).toHaveBeenCalledWith(
      applicationId,
    );
  });
});
