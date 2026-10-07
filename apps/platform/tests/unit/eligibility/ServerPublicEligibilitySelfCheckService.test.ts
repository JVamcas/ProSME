import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/reporting/infrastructure/AnonymousEligibilityRepository",
  () => ({
    recordAnonymousEligibilityCheck: vi.fn(),
  }),
);
vi.mock(
  "@/modules/funding-calls/application/ServerPublicFundingCallService",
  () => ({ findPublicFundingCallById: vi.fn() }),
);
vi.mock(
  "@/modules/eligibility/application/ServerEligibilityBindingService",
  () => ({ resolveSelfCheckEligibilityConfiguration: vi.fn() }),
);
import { recordAnonymousEligibilityCheck } from "@/modules/reporting/infrastructure/AnonymousEligibilityRepository";
import {
  evaluatePublicEligibilitySelfCheck,
  getPublicEligibilitySelfCheck,
  PublicEligibilitySelfCheckChangedError,
  PublicEligibilitySelfCheckUnavailableError,
} from "@/modules/eligibility/application/ServerPublicEligibilitySelfCheckService";
import { resolveSelfCheckEligibilityConfiguration } from "@/modules/eligibility/application/ServerEligibilityBindingService";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

import {
  fundingCallId,
  fundingCall,
  ruleSet,
  selfCheckInput,
} from "./fixtures/PublicEligibilitySelfCheckFixture";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findPublicFundingCallById).mockResolvedValue(fundingCall);
  vi.mocked(resolveSelfCheckEligibilityConfiguration).mockResolvedValue({
    inputs: [
      selfCheckInput(
        "registered",
        "Business is registered",
        ["SELF_CHECK", "SCREENING"],
        1,
      ),
      selfCheckInput(
        "statutory_good_standing",
        "Statutory good standing",
        ["SELF_CHECK"],
        2,
      ),
      selfCheckInput(
        "bank_account_active",
        "Active business bank account",
        ["SELF_CHECK"],
        3,
      ),
    ],
    ruleSet,
  } as never);
});

describe("public eligibility self-check", () => {
  it("exposes only fields required by self-check and both-mode rules", async () => {
    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);

    expect(workspace).toMatchObject({
      advisory: true,
      fundingCall: { id: fundingCallId, title: "Growth Fund" },
    });
    expect(workspace.questions.map((question) => question.label)).toEqual([
      "Business is registered",
      "Statutory good standing",
      "Active business bank account",
    ]);
    expect(resolveSelfCheckEligibilityConfiguration).toHaveBeenCalledWith(
      fundingCallId,
    );
    expect(workspace).not.toHaveProperty("ruleSetVersionId");
    expect(workspace).not.toHaveProperty("ruleSetVersionNumber");
    expect(JSON.stringify(workspace)).not.toContain("INTERNAL_");
  });

  it("returns applicant guidance for hard, soft, and warning failures", async () => {
    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);
    const answers = Object.fromEntries(
      workspace.questions.map((question) => [question.id, false]),
    );

    const result = await evaluatePublicEligibilitySelfCheck(fundingCallId, {
      answers,
      configurationToken: workspace.configurationToken,
    });

    expect(result).toMatchObject({
      advisory: true,
      outcome: "not-currently-eligible",
    });
    expect(result.guidance).toEqual([
      { message: "The business must be registered.", severity: "blocking" },
      {
        message: "Resolve statutory compliance before applying.",
        severity: "review",
      },
      {
        message: "An active business bank account will be required.",
        severity: "warning",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("ruleId");
    expect(JSON.stringify(result)).not.toContain("reasonCode");
  });

  it("keeps guidance available when consented anonymous logging fails", async () => {
    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);
    const answers = Object.fromEntries(
      workspace.questions.map((question) => [question.id, false]),
    );
    vi.mocked(recordAnonymousEligibilityCheck).mockRejectedValue(
      new Error("database unavailable"),
    );
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const response = await evaluatePublicEligibilitySelfCheck(
        fundingCallId,
        {
          answers,
          configurationToken: workspace.configurationToken,
        },
        true,
      );
      expect(response.outcome).toBe("not-currently-eligible");
      expect(response.guidance[0].message).toBe(
        "The business must be registered.",
      );
      expect(recordAnonymousEligibilityCheck).toHaveBeenCalledWith({
        fundingCallId,
        ruleSetVersionId: ruleSet.versionId,
        outcome: "not-currently-eligible",
      });
    } finally {
      warning.mockRestore();
    }
  });

  it("rejects a stale ruleset configuration token", async () => {
    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);
    const answers = Object.fromEntries(
      workspace.questions.map((question) => [question.id, true]),
    );

    await expect(
      evaluatePublicEligibilitySelfCheck(fundingCallId, {
        answers,
        configurationToken: "0".repeat(64),
      }),
    ).rejects.toBeInstanceOf(PublicEligibilitySelfCheckChangedError);
  });

  it("does not offer self-check for a closed call", async () => {
    vi.mocked(findPublicFundingCallById).mockResolvedValue({
      ...fundingCall,
      applicationsOpen: false,
      status: "closed",
    });

    await expect(
      getPublicEligibilitySelfCheck(fundingCallId),
    ).rejects.toBeInstanceOf(PublicEligibilitySelfCheckUnavailableError);
  });
});
