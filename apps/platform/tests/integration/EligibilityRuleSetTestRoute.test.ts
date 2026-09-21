import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/eligibility/application/ServerEligibilityTestService", () => ({
  testEligibilityRuleSet: vi.fn(),
}));

import * as route from "@/app/api/admin/eligibility-rulesets/[id]/test/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import { testEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityTestService";

const actor = { id: "eligibility-tester" } as AuthenticatedUser;
const ruleSetId = "92000000-0000-4000-8000-000000000001";
const versionId = "92000000-0000-4000-8000-000000000002";
const input = {
  fundingCallId: "92000000-0000-4000-8000-000000000003",
  mode: "SELF_CHECK",
  values: {
    application: {
      annual_turnover: 100_000,
      business: {
        bank_account_active: true,
        employee_count: 2,
        operating_months: 12,
        ownership_percentage: 80,
        registered: true,
        statutory_good_standing: true,
      },
      requested_amount: 50_000,
    },
  },
  versionId,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
});

describe("eligibility ruleset test route", () => {
  it("validates and runs a non-authoritative eligibility test", async () => {
    vi.mocked(testEligibilityRuleSet).mockResolvedValue({
      authoritative: false,
      eligible: true,
      ruleOutcomes: [],
      ruleSetVersionId: versionId,
    } as never);
    const response = await route.POST(
      new Request(`http://localhost/api/admin/eligibility-rulesets/${ruleSetId}/test`, {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: ruleSetId }) },
    );

    expect(response.status).toBe(200);
    expect(testEligibilityRuleSet).toHaveBeenCalledWith(
      actor,
      ruleSetId,
      input,
    );
    await expect(response.json()).resolves.toMatchObject({
      data: { authoritative: false, ruleSetVersionId: versionId },
    });
  });

  it("rejects malformed sample data before invoking the service", async () => {
    const response = await route.POST(
      new Request(`http://localhost/api/admin/eligibility-rulesets/${ruleSetId}/test`, {
        body: JSON.stringify({ ...input, mode: "BOTH" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: ruleSetId }) },
    );

    expect(response.status).toBe(400);
    expect(testEligibilityRuleSet).not.toHaveBeenCalled();
  });
});
