import { describe, expect, it } from "vitest";

import type { EligibilityEvaluationRuleSet } from "@/modules/eligibility/domain/EligibilityEvaluation";
import type { EligibilityInputDefinition } from "@/modules/eligibility/domain/EligibilityInputDefinition";
import {
  resolveScreeningEligibilityInputs,
  resolveSelfCheckEligibilityInputs,
} from "@/modules/eligibility/application/EligibilityInputResolver";
import { evaluateEligibilityRuleSet } from "@/modules/eligibility/engine/EligibilityEvaluator";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";

const versionOneId = "10000000-0000-4000-8000-000000000001";
const versionTwoId = "10000000-0000-4000-8000-000000000002";
const inputId = "20000000-0000-4000-8000-000000000001";
const sourceId = "30000000-0000-4000-8000-000000000001";
const sourceVersionId = "40000000-0000-4000-8000-000000000001";
const evaluatedAt = new Date("2026-09-22T08:00:00.000Z");

const input: EligibilityInputDefinition = {
  availableIn: ["SELF_CHECK", "SCREENING"],
  createdAt: evaluatedAt,
  createdBy: "system",
  groupKey: "baseline",
  groupLabel: "Eligibility",
  id: inputId,
  label: "Namibian ownership percentage",
  order: 1,
  screening: {
    sourceDefinitionId: sourceId,
    sourceKey: "NAMIBIAN_OWNERSHIP_PERCENTAGE",
    sourceKind: "WORKFLOW_FORM_FIELD",
    sourceVersionId,
    valuePath: "value",
  },
  selfCheck: {
    answerType: "PERCENTAGE",
    explanation: "The answer will be verified during Screening.",
    helpText: "Enter a percentage.",
    options: [],
    prompt: "What percentage is Namibian-owned?",
    required: true,
  },
  stableKey: "namibian_ownership_percentage",
  type: "NUMBER",
  updatedAt: evaluatedAt,
  updatedBy: "system",
  versionId: versionOneId,
};

function ruleset(versionId: string, versionNumber: number, threshold: number) {
  return {
    ruleSetId: "50000000-0000-4000-8000-000000000001",
    rules: [{
      applicantMessage: "The ownership threshold is not met.",
      condition: {
        conditionGroupId: "60000000-0000-4000-8000-000000000001",
        kind: "GROUP" as const,
      },
      conditionDefinition: {
        children: [{
          id: "70000000-0000-4000-8000-000000000001",
          kind: "CONDITION" as const,
          leftOperand: {
            key: "eligibility.namibian_ownership_percentage",
            kind: "FIELD" as const,
          },
          operator: basicOperators.GREATER_THAN_OR_EQUAL,
          rightOperand: { kind: "CONSTANT" as const, value: threshold },
        }],
        combinator: "AND" as const,
        id: "60000000-0000-4000-8000-000000000001",
        kind: "GROUP" as const,
      },
      executionMode: "BOTH" as const,
      failureType: "HARD_FAIL" as const,
      id: "80000000-0000-4000-8000-000000000001",
      order: 1,
      reasonCode: "NAMIBIAN_OWNERSHIP_BELOW_MINIMUM",
    }],
    versionId,
    versionNumber,
  } satisfies EligibilityEvaluationRuleSet;
}

function evaluate(
  configuration: EligibilityEvaluationRuleSet,
  mode: "SELF_CHECK" | "SCREENING",
  value: number,
) {
  return evaluateEligibilityRuleSet(configuration, mode, {
    application: {},
    eligibility: { namibian_ownership_percentage: value },
    fundingCall: {},
    stages: [],
  });
}

describe("Eligibility lifecycle verification", () => {
  it("uses the applicant answer for Self Check and verified evidence for Screening", async () => {
    const selfCheck = resolveSelfCheckEligibilityInputs({
      answers: { namibian_ownership_percentage: 80 },
      inputs: [input],
      paths: ["eligibility.namibian_ownership_percentage"],
    });
    const screening = await resolveScreeningEligibilityInputs({
      adapters: [{
        sourceKind: "WORKFLOW_FORM_FIELD",
        async resolve() {
          return new Map([[inputId, {
            status: "RESOLVED" as const,
            value: { sourceRecordId: "application-1", value: 40 },
          }]]);
        },
      }],
      applicationId: "application-1",
      evaluatedAt,
      inputs: [input],
      paths: ["eligibility.namibian_ownership_percentage"],
    });
    const configuration = ruleset(versionOneId, 1, 51);

    expect(evaluate(
      configuration,
      "SELF_CHECK",
      selfCheck.values.namibian_ownership_percentage as number,
    ).eligible).toBe(true);
    const authoritative = evaluate(
      configuration,
      "SCREENING",
      screening.values.namibian_ownership_percentage as number,
    );
    expect(authoritative).toMatchObject({
      eligible: false,
      reasonCodes: ["NAMIBIAN_OWNERSHIP_BELOW_MINIMUM"],
      ruleSetVersionId: versionOneId,
      ruleSetVersionNumber: 1,
    });
    expect(screening.provenance)
      .toHaveProperty("eligibility.namibian_ownership_percentage", {
        evaluatedAt: evaluatedAt.toISOString(),
        inputDefinitionId: inputId,
        inputStableKey: "namibian_ownership_percentage",
        mode: "SCREENING",
        sourceDefinitionId: sourceId,
        sourceKey: "NAMIBIAN_OWNERSHIP_PERCENTAGE",
        sourceKind: "WORKFLOW_FORM_FIELD",
        sourceRecordId: "application-1",
        sourceVersionId,
      });
  });

  it("retains the original application outcome after a later version changes", () => {
    const storedOutcome = evaluate(ruleset(versionOneId, 1, 51), "SCREENING", 40);
    const laterOutcome = evaluate(ruleset(versionTwoId, 2, 30), "SCREENING", 40);

    expect(storedOutcome).toMatchObject({
      eligible: false,
      ruleSetVersionId: versionOneId,
      ruleSetVersionNumber: 1,
    });
    expect(laterOutcome).toMatchObject({
      eligible: true,
      ruleSetVersionId: versionTwoId,
      ruleSetVersionNumber: 2,
    });
    expect(storedOutcome.eligible).toBe(false);
  });
});
