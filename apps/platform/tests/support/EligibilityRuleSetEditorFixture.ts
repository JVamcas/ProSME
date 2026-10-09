import type { EligibilityRuleSetBuilderView } from "@/modules/eligibility/api/EligibilityRuleSetTransport";

export const ruleSetId = "70000000-0000-4000-8000-000000000001";
export const versionId = "70000000-0000-4000-8000-000000000002";
export function builder(status: "DRAFT" | "PUBLISHED") {
  const timestamp = "2026-09-20T08:00:00.000Z";
  return {
    allowedActions:
      status === "DRAFT" ? ["UPDATE", "PUBLISH"] : ["RETIRE", "CLONE"],
    availableQuestions: [
      {
        applicantLabel: "How many people does your business employ?",
        code: "EMPLOYEE_COUNT",
        id: "70000000-0000-4000-8000-000000000014",
        inputType: "NUMBER",
        reviewerLabel: "Employee count",
      },
      {
        applicantLabel: "Is your business registered?",
        code: "BUSINESS_REGISTERED",
        id: "70000000-0000-4000-8000-000000000015",
        inputType: "BOOLEAN",
        reviewerLabel: "Business registration",
      },
    ],
    definition: {
      code: "SME_STANDARD",
      createdAt: timestamp,
      createdBy: "70000000-0000-4000-8000-000000000009",
      description: "Standard SME Fund eligibility",
      id: ruleSetId,
      name: "SME Fund Standard",
      updatedAt: timestamp,
    },
    conditionFields: [
      {
        availableIn: ["SELF_CHECK", "SCREENING"],
        key: "eligibility.EMPLOYEE_COUNT",
        label: "Employee count",
        screeningSource: {
          sourceDefinitionId: "70000000-0000-4000-8000-000000000011",
          sourceKey: "EMPLOYEE_COUNT",
          sourceKind: "APPLICATION_FORM_FIELD",
          sourceVersionId: "70000000-0000-4000-8000-000000000012",
          valuePath: "answers.EMPLOYEE_COUNT",
        },
        sourceDefinitionId: "70000000-0000-4000-8000-000000000013",
        sourceKind: "ELIGIBILITY_INPUT",
        sourceVersionId: versionId,
        type: "NUMBER",
      },
    ],
    context: {
      fundingCalls: [
        {
          id: "70000000-0000-4000-8000-000000000010",
          title: "Growth Fund",
        },
      ],
    },
    rules: [
      {
        applicantMessage: "Your business must employ at least one person.",
        condition: {
          children: [
            {
              id: "70000000-0000-4000-8000-000000000005",
              kind: "CONDITION",
              leftOperand: {
                key: "eligibility.EMPLOYEE_COUNT",
                kind: "FIELD",
              },
              operator: "GREATER_THAN",
              rightOperand: { kind: "CONSTANT", value: 0 },
            },
          ],
          combinator: "AND",
          id: "70000000-0000-4000-8000-000000000004",
          kind: "GROUP",
        },
        executionMode: "BOTH",
        failureType: "HARD_FAIL",
        id: "70000000-0000-4000-8000-000000000003",
        order: 1,
        questionId: "70000000-0000-4000-8000-000000000014",
        reasonCode: "EMPLOYEE_REQUIRED",
      },
    ],
    registryIssues: [],
    screeningSources: [
      {
        availableBeforeEligibility: true,
        fundingCallId: "70000000-0000-4000-8000-000000000010",
        label: "Verified employee count",
        sourceDefinitionId: "70000000-0000-4000-8000-000000000011",
        sourceKey: "EMPLOYEE_COUNT",
        sourceKind: "APPLICATION_FORM_FIELD",
        sourceVersionId: "70000000-0000-4000-8000-000000000012",
        supportedTypes: ["NUMBER"],
      },
    ],
    version: {
      createdAt: timestamp,
      createdBy: "70000000-0000-4000-8000-000000000009",
      id: versionId,
      publishedAt: status === "PUBLISHED" ? timestamp : null,
      retiredAt: null,
      rowVersion: 1,
      ruleSetId,
      status,
      updatedAt: timestamp,
      versionNumber: 1,
    },
    versions: [],
  } as unknown as EligibilityRuleSetBuilderView;
}
