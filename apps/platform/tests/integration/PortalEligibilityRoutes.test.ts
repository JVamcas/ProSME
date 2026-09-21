import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/eligibility/ServerEligibilityService", () => ({
  createEligibilityAssessment: vi.fn(),
  getEligibilityWorkspace: vi.fn(),
}));

import * as route from "@/app/api/portal/eligibility-assessments/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  createEligibilityAssessment,
  getEligibilityWorkspace,
} from "@/modules/eligibility/ServerEligibilityService";

const actor = { id: "actor-id" } as AuthenticatedUser;
const fundingOpportunityId = "00000000-0000-4000-8000-000000000042";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
});

describe("portal eligibility assessment routes", () => {
  it("returns the current workspace for an opportunity", async () => {
    vi.mocked(getEligibilityWorkspace).mockResolvedValue({
      assessments: [],
      fundingOpportunity: { id: fundingOpportunityId, title: "Growth Fund" },
      rules: [],
      ruleSetVersion: "v1",
    });
    const response = await route.GET(new Request(
      `http://localhost:3008/api/portal/eligibility-assessments?fundingOpportunityId=${fundingOpportunityId}`,
    ));

    expect(response.status).toBe(200);
    expect(getEligibilityWorkspace).toHaveBeenCalledWith(
      actor,
      fundingOpportunityId,
    );
  });

  it("validates assessment answers before invoking the service", async () => {
    const response = await route.POST(new Request(
      "http://localhost:3008/api/portal/eligibility-assessments",
      {
        body: JSON.stringify({
          answers: { ownership: "maybe" },
          expectedRuleSetVersion: "v1",
          fundingOpportunityId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    ));

    expect(response.status).toBe(400);
    expect(createEligibilityAssessment).not.toHaveBeenCalled();
  });

  it("returns a conflict when the published questions changed", async () => {
    vi.mocked(createEligibilityAssessment).mockRejectedValue(
      new ResourceConflictError("Questions changed."),
    );
    const response = await route.POST(new Request(
      "http://localhost:3008/api/portal/eligibility-assessments",
      {
        body: JSON.stringify({
          answers: { ownership: "yes" },
          expectedRuleSetVersion: "v1",
          fundingOpportunityId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    ));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CONFLICT", message: "Questions changed." },
    });
  });
});
