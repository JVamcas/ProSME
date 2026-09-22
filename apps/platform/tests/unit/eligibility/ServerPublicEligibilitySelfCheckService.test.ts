import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/funding-calls/application/ServerPublicFundingCallService",
  () => ({ findPublicFundingCallById: vi.fn() }),
);
vi.mock(
  "@/modules/eligibility/application/ServerEligibilityBindingService",
  () => ({ resolveSelfCheckEligibilityConfiguration: vi.fn() }),
);
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  evaluatePublicEligibilitySelfCheck,
  getPublicEligibilitySelfCheck,
  PublicEligibilitySelfCheckChangedError,
  PublicEligibilitySelfCheckUnavailableError,
} from "@/modules/eligibility/application/ServerPublicEligibilitySelfCheckService";
import { resolveSelfCheckEligibilityConfiguration } from "@/modules/eligibility/application/ServerEligibilityBindingService";
import type {
  EligibilityEvaluationRule,
  EligibilityEvaluationRuleSet,
} from "@/modules/eligibility/domain/EligibilityEvaluation";
import type { EligibilityInputDefinition } from "@/modules/eligibility/domain/EligibilityInputDefinition";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

const fundingCallId = "00000000-0000-4000-8000-000000000042";

function rule(
  id: string,
  path: string,
  expected: boolean | number,
  failureType: EligibilityEvaluationRule["failureType"],
  executionMode: EligibilityEvaluationRule["executionMode"],
  applicantMessage: string,
  order: number,
): EligibilityEvaluationRule {
  return {
    applicantMessage,
    condition: {
      conditionGroupId: "10000000-0000-4000-8000-000000000001",
      conditionId: id,
      kind: "CONDITION",
    },
    conditionDefinition: {
      id,
      kind: "CONDITION",
      leftOperand: { key: path, kind: "FIELD" },
      operator: basicOperators.EQUALS,
      rightOperand: { kind: "CONSTANT", value: expected },
    },
    executionMode,
    failureType,
    id,
    order,
    reasonCode: `INTERNAL_${order}`,
  };
}

const ruleSet: EligibilityEvaluationRuleSet = {
  ruleSetId: "20000000-0000-4000-8000-000000000001",
  rules: [
    rule(
      "30000000-0000-4000-8000-000000000001",
      "eligibility.registered",
      true,
      "HARD_FAIL",
      "BOTH",
      "The business must be registered.",
      1,
    ),
    rule(
      "30000000-0000-4000-8000-000000000002",
      "eligibility.statutory_good_standing",
      true,
      "SOFT_FAIL",
      "SELF_CHECK",
      "Resolve statutory compliance before applying.",
      2,
    ),
    rule(
      "30000000-0000-4000-8000-000000000003",
      "eligibility.bank_account_active",
      true,
      "WARNING",
      "SELF_CHECK",
      "An active business bank account will be required.",
      3,
    ),
    rule(
      "30000000-0000-4000-8000-000000000004",
      "eligibility.annual_turnover",
      100,
      "HARD_FAIL",
      "SCREENING",
      "Internal screening message.",
      4,
    ),
  ],
  versionId: "20000000-0000-4000-8000-000000000002",
  versionNumber: 4,
};

function selfCheckInput(
  stableKey: string,
  prompt: string,
  availableIn: EligibilityInputDefinition["availableIn"] = ["SELF_CHECK"],
): EligibilityInputDefinition {
  return {
    availableIn,
    createdAt: new Date(),
    createdBy: "10000000-0000-4000-8000-000000000001",
    groupKey: null,
    groupLabel: null,
    id: `50000000-0000-4000-8000-${stableKey.padEnd(12, "0").slice(0, 12)}`,
    label: prompt,
    order: 1,
    screening: availableIn.includes("SCREENING")
      ? {
          sourceDefinitionId: "60000000-0000-4000-8000-000000000001",
          sourceKey: stableKey,
          sourceKind: "APPLICATION_FORM_FIELD",
          sourceVersionId: "60000000-0000-4000-8000-000000000002",
          valuePath: "value",
        }
      : null,
    selfCheck: {
      answerType: "BOOLEAN",
      explanation: "",
      helpText: "",
      options: [],
      prompt,
      required: true,
    },
    stableKey,
    type: "BOOLEAN",
    updatedAt: new Date(),
    updatedBy: "10000000-0000-4000-8000-000000000001",
    versionId: ruleSet.versionId,
  };
}

const fundingCall = {
  applicationsOpen: true,
  closesAt: "2026-10-31T22:00:00.000Z",
  description: "<p>Growth funding.</p>",
  eligibilitySummary: "Registered SMEs may qualify.",
  fundingInstrument: "Grant",
  id: fundingCallId,
  maximumAmount: 200000,
  minimumAmount: 50000,
  opensAt: "2026-09-01T00:00:00.000Z",
  publicContact: { email: null, name: null, phone: null },
  publicDocuments: [],
  reference: "GROWTH-2026",
  selfCheckAvailable: true,
  slug: "growth-fund",
  status: "open" as const,
  summary: "Growth funding.",
  thematicArea: "Growth",
  title: "Growth Fund",
  totalFundingAmount: 1000000,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findPublicFundingCallById).mockResolvedValue(fundingCall);
  vi.mocked(resolveSelfCheckEligibilityConfiguration).mockResolvedValue({
    inputs: [
      selfCheckInput(
        "registered",
        "Business is registered",
        ["SELF_CHECK", "SCREENING"],
      ),
      selfCheckInput(
        "statutory_good_standing",
        "Statutory good standing",
      ),
      selfCheckInput(
        "bank_account_active",
        "Active business bank account",
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
    expect(resolveSelfCheckEligibilityConfiguration)
      .toHaveBeenCalledWith(fundingCallId);
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
