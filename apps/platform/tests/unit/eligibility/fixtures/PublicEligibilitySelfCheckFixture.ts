import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import type {
  EligibilityEvaluationRule,
  EligibilityEvaluationRuleSet,
} from "@/modules/eligibility/domain/EligibilityEvaluation";
import type {
  EligibilityInputDefinition,
  SelfCheckQuestionDefinition,
} from "@/modules/eligibility/domain/EligibilityInputDefinition";

export const fundingCallId = "00000000-0000-4000-8000-000000000042";

function rule(
  id: string,
  path: string,
  expected: boolean | number | string | string[],
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

export const ruleSet: EligibilityEvaluationRuleSet = {
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

export function selfCheckInput(
  stableKey: string,
  prompt: string,
  availableIn: EligibilityInputDefinition["availableIn"] = ["SELF_CHECK"],
  order = 1,
  question: Partial<SelfCheckQuestionDefinition> = {},
  type: EligibilityInputDefinition["type"] = "BOOLEAN",
): EligibilityInputDefinition {
  return {
    availableIn,
    createdAt: new Date(),
    createdBy: "10000000-0000-4000-8000-000000000001",
    groupKey: null,
    groupLabel: null,
    id: `50000000-0000-4000-8000-${stableKey.padEnd(12, "0").slice(0, 12)}`,
    label: prompt,
    order,
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
      answerType: question.answerType ?? "BOOLEAN",
      explanation: question.explanation ?? "",
      helpText: question.helpText ?? "",
      options: question.options ?? [],
      prompt,
      required: question.required ?? true,
    },
    stableKey,
    type,
    updatedAt: new Date(),
    updatedBy: "10000000-0000-4000-8000-000000000001",
    versionId: ruleSet.versionId,
  };
}

export const fundingCall = {
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
