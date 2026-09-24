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
} from "@/modules/eligibility/application/ServerPublicEligibilitySelfCheckService";
import { resolveSelfCheckEligibilityConfiguration } from "@/modules/eligibility/application/ServerEligibilityBindingService";
import type { EligibilityEvaluationRuleSet } from "@/modules/eligibility/domain/EligibilityEvaluation";
import type {
  EligibilityInputDefinition,
  SelfCheckAnswerType,
  SelfCheckQuestionOption,
} from "@/modules/eligibility/domain/EligibilityInputDefinition";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

const fundingCallId = "00000000-0000-4000-8000-000000000042";
const versionId = "20000000-0000-4000-8000-000000000002";

type Answer = boolean | number | string | string[];

function inputDefinition(
  answerType: SelfCheckAnswerType,
  type: EligibilityInputDefinition["type"],
  options: SelfCheckQuestionOption[],
): EligibilityInputDefinition {
  return {
    availableIn: ["SELF_CHECK"],
    createdAt: new Date(),
    createdBy: "actor",
    groupKey: "business-details",
    groupLabel: "Business details",
    id: "50000000-0000-4000-8000-000000000001",
    label: "Configured answer",
    order: 2,
    screening: null,
    selfCheck: {
      answerType,
      explanation: "Applicant-safe explanation.",
      helpText: "Applicant-safe help.",
      options,
      prompt: "Configured question",
      required: true,
    },
    stableKey: "configured_answer",
    type,
    updatedAt: new Date(),
    updatedBy: "actor",
    versionId,
  };
}

function ruleSet(expected: Answer): EligibilityEvaluationRuleSet {
  return {
    ruleSetId: "20000000-0000-4000-8000-000000000001",
    rules: [{
      applicantMessage: "Review this answer.",
      condition: {
        conditionGroupId: "10000000-0000-4000-8000-000000000001",
        conditionId: "30000000-0000-4000-8000-000000000001",
        kind: "CONDITION",
      },
      conditionDefinition: {
        id: "30000000-0000-4000-8000-000000000001",
        kind: "CONDITION",
        leftOperand: { key: "eligibility.configured_answer", kind: "FIELD" },
        operator: basicOperators.EQUALS,
        rightOperand: { kind: "CONSTANT", value: expected },
      },
      executionMode: "SELF_CHECK",
      failureType: "HARD_FAIL",
      id: "30000000-0000-4000-8000-000000000002",
      order: 1,
      reasonCode: "INTERNAL_REASON",
    }],
    versionId,
    versionNumber: 4,
  };
}

function configure(
  answerType: SelfCheckAnswerType,
  type: EligibilityInputDefinition["type"],
  answer: Answer,
  options: SelfCheckQuestionOption[] = [],
) {
  vi.mocked(resolveSelfCheckEligibilityConfiguration).mockResolvedValue({
    inputs: [inputDefinition(answerType, type, options)],
    ruleSet: ruleSet(answer),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findPublicFundingCallById).mockResolvedValue({
    applicationsOpen: true,
    id: fundingCallId,
    selfCheckAvailable: true,
    slug: "growth-fund",
    status: "open",
    title: "Growth Fund",
  } as never);
});

describe("public Eligibility Self Check configured response types", () => {
  it.each([
    ["BOOLEAN", "BOOLEAN", true, []],
    ["YES_NO_NA", "TEXT", "NOT_APPLICABLE", []],
    ["TEXT", "TEXT", "Namibia", []],
    ["NUMBER", "NUMBER", 24, []],
    ["PERCENTAGE", "NUMBER", 51.5, []],
    ["DATE", "DATE", "2026-09-22", []],
    ["SINGLE_SELECT", "TEXT", "registered", [
      { label: "Registered", value: "registered" },
      { label: "Not registered", value: "not_registered" },
    ]],
    ["MULTI_SELECT", "TEXT", ["khomas", "oshana"], [
      { label: "Khomas", value: "khomas" },
      { label: "Oshana", value: "oshana" },
    ]],
  ] as const)("accepts the configured %s response type", async (
    answerType,
    type,
    answer,
    options,
  ) => {
    const submitted: Answer = typeof answer === "object" ? [...answer] : answer;
    configure(answerType, type, submitted, [...options]);
    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);

    const result = await evaluatePublicEligibilitySelfCheck(fundingCallId, {
      answers: { [workspace.questions[0].id]: submitted },
      configurationToken: workspace.configurationToken,
    });

    expect(result.outcome).toBe("likely-eligible");
  });

  it("projects applicant presentation without Screening or rule metadata", async () => {
    configure("SINGLE_SELECT", "TEXT", "registered", [{
      description: "Registration is active.",
      label: "Registered",
      value: "registered",
    }, {
      description: "Registration is not active.",
      label: "Not registered",
      value: "not_registered",
    }]);

    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);

    expect(workspace.questions).toEqual([expect.objectContaining({
      helpText: "Applicant-safe help.",
      options: [
        expect.objectContaining({ description: "Registration is active." }),
        expect.objectContaining({ value: "not_registered" }),
      ],
      progress: { current: 1, total: 1 },
      section: { key: "business-details", label: "Business details" },
      type: "single-select",
    })]);
    expect(JSON.stringify(workspace)).not.toContain("sourceKind");
    expect(JSON.stringify(workspace)).not.toContain("INTERNAL_REASON");
  });

  it("keeps Yes/No/Not applicable distinct from boolean", async () => {
    configure("YES_NO_NA", "TEXT", "NOT_APPLICABLE");

    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);

    expect(workspace.questions[0]).toMatchObject({
      options: [
        { label: "Yes", value: "YES" },
        { label: "No", value: "NO" },
        { label: "Not applicable", value: "NOT_APPLICABLE" },
      ],
      type: "yes-no-na",
    });
  });

  it("rejects values outside applicant-safe validation", async () => {
    configure("PERCENTAGE", "NUMBER", 51);
    const workspace = await getPublicEligibilitySelfCheck(fundingCallId);

    await expect(evaluatePublicEligibilitySelfCheck(fundingCallId, {
      answers: { [workspace.questions[0].id]: 101 },
      configurationToken: workspace.configurationToken,
    })).rejects.toMatchObject({
      userMessage: "Review the eligibility answers.",
    });
  });
});
