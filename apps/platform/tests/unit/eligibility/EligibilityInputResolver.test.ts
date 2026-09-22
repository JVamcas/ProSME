import { describe, expect, it } from "vitest";

import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  eligibilityInputPathsForEvaluation,
  resolveEligibilitySampleInputs,
  resolveScreeningEligibilityInputs,
  resolveSelfCheckEligibilityInputs,
} from "@/modules/eligibility/application/EligibilityInputResolver";
import { createEligibilitySourceAdapter } from "@/modules/eligibility/application/EligibilitySourceAdapter";
import { EligibilityInputResolutionError } from "@/modules/eligibility/domain/EligibilityDataResolution";
import type { EligibilityEvaluationRuleSet } from "@/modules/eligibility/domain/EligibilityEvaluation";
import type {
  EligibilityInputDefinition,
  EligibilityScreeningSourceKind,
} from "@/modules/eligibility/domain/EligibilityInputDefinition";

const versionId = "10000000-0000-4000-8000-000000000001";
const evaluatedAt = new Date("2026-09-22T08:00:00.000Z");

function definition(
  sourceKind: EligibilityScreeningSourceKind,
  stableKey = sourceKind.toLowerCase(),
): EligibilityInputDefinition {
  return {
    availableIn: ["SELF_CHECK", "SCREENING"],
    createdAt: evaluatedAt,
    createdBy: "actor",
    groupKey: null,
    groupLabel: null,
    id: `input-${stableKey}`,
    label: stableKey,
    order: 1,
    screening: {
      sourceDefinitionId: `definition-${stableKey}`,
      sourceKey: "configured_key",
      sourceKind,
      sourceVersionId: sourceKind === "FUNDING_CALL_FIELD"
        ? null
        : `version-${stableKey}`,
      valuePath: "value",
    },
    selfCheck: {
      answerType: "BOOLEAN",
      explanation: "",
      helpText: "",
      options: [],
      prompt: stableKey,
      required: true,
    },
    stableKey,
    type: "BOOLEAN",
    updatedAt: evaluatedAt,
    updatedBy: "actor",
    versionId,
  };
}

function ruleSet(path: string): EligibilityEvaluationRuleSet {
  return {
    ruleSetId: "ruleset",
    rules: [{
      applicantMessage: "Requirement not met.",
      condition: {
        conditionGroupId: "group",
        conditionId: "condition",
        kind: "CONDITION",
      },
      conditionDefinition: {
        id: "condition",
        kind: "CONDITION",
        leftOperand: { key: path, kind: "FIELD" },
        operator: basicOperators.EQUALS,
        rightOperand: { kind: "CONSTANT", value: true },
      },
      executionMode: "BOTH",
      failureType: "HARD_FAIL",
      id: "rule",
      order: 1,
      reasonCode: "REQUIREMENT",
    }],
    versionId,
    versionNumber: 1,
  };
}

describe("mode-specific Eligibility input resolution", () => {
  it("resolves one Both-mode path from independent Self Check and Screening values", async () => {
    const input = definition("DOCUMENT_REQUIREMENT_FACT", "verified");
    const rules = ruleSet("eligibility.verified");
    const paths = eligibilityInputPathsForEvaluation(rules, "SELF_CHECK");

    const selfCheck = resolveSelfCheckEligibilityInputs({
      answers: { verified: false },
      inputs: [input],
      paths,
    });
    const screening = await resolveScreeningEligibilityInputs({
      adapters: [createEligibilitySourceAdapter(
        "DOCUMENT_REQUIREMENT_FACT",
        {
          async read() {
            return [{
              sourceDefinitionId: input.screening!.sourceDefinitionId,
              sourceKey: input.screening!.sourceKey,
              sourceRecordId: "document-version-7",
              sourceVersionId: input.screening!.sourceVersionId,
              values: { value: true },
            }];
          },
        },
      )],
      applicationId: "application-1",
      evaluatedAt,
      inputs: [input],
      paths: eligibilityInputPathsForEvaluation(rules, "SCREENING"),
    });

    expect(selfCheck.values).toEqual({ verified: false });
    expect(screening.values).toEqual({ verified: true });
    expect(screening.provenance["eligibility.verified"]).toMatchObject({
      evaluatedAt: evaluatedAt.toISOString(),
      sourceKind: "DOCUMENT_REQUIREMENT_FACT",
      sourceRecordId: "document-version-7",
    });
  });

  it.each([
    "APPLICATION_FORM_FIELD",
    "FUNDING_CALL_FIELD",
    "WORKFLOW_FORM_FIELD",
    "SCREENING_CHECKLIST_ITEM",
    "DOCUMENT_REQUIREMENT_FACT",
    "MANUAL_ASSESSMENT",
    "INTEGRATION_OUTPUT",
  ] as const)("resolves the configured %s adapter without fixed field paths", async (sourceKind) => {
    const input = definition(sourceKind);
    const adapter = createEligibilitySourceAdapter(sourceKind, {
      async read() {
        return [{
          sourceDefinitionId: input.screening!.sourceDefinitionId,
          sourceKey: input.screening!.sourceKey,
          sourceRecordId: `record-${sourceKind}`,
          sourceVersionId: input.screening!.sourceVersionId,
          values: { value: true },
        }];
      },
    });

    const result = await resolveScreeningEligibilityInputs({
      adapters: [adapter],
      applicationId: "application-1",
      evaluatedAt,
      inputs: [input],
      paths: [`eligibility.${input.stableKey}`],
    });

    expect(result.values[input.stableKey]).toBe(true);
    expect(result.provenance[`eligibility.${input.stableKey}`].sourceKind)
      .toBe(sourceKind);
  });

  it.each([
    ["MISSING", { async read() { return []; } }],
    ["UNAVAILABLE", { async read() { throw new Error("offline"); } }],
    ["INVALID", {
      async read() {
        return [{
          sourceDefinitionId: "definition-invalid_value",
          sourceKey: "configured_key",
          sourceRecordId: "record",
          sourceVersionId: "version-invalid_value",
          values: { value: "not a boolean" },
        }];
      },
    }],
  ] as const)("reports %s instead of evaluating it as false", async (status, reader) => {
    const input = definition("APPLICATION_FORM_FIELD", "invalid_value");
    const promise = resolveScreeningEligibilityInputs({
      adapters: [createEligibilitySourceAdapter(
        "APPLICATION_FORM_FIELD",
        reader,
      )],
      applicationId: "application-1",
      evaluatedAt,
      inputs: [input],
      paths: ["eligibility.invalid_value"],
    });

    await expect(promise).rejects.toMatchObject({
      resolutions: [{ status }],
    });
  });

  it("validates test-screen samples through the same logical input catalogue", () => {
    const input = definition("APPLICATION_FORM_FIELD", "sample_input");
    expect(resolveEligibilitySampleInputs({
      inputs: [input],
      mode: "SCREENING",
      paths: ["eligibility.sample_input"],
      values: { sample_input: true },
    }).values).toEqual({ sample_input: true });

    expect(() => resolveEligibilitySampleInputs({
      inputs: [input],
      mode: "SCREENING",
      paths: ["eligibility.sample_input"],
      values: {},
    })).toThrow(EligibilityInputResolutionError);
  });

  it("resolves an unanswered optional Self Check question as null", () => {
    const input = definition("APPLICATION_FORM_FIELD", "optional_answer");
    input.selfCheck!.required = false;

    const result = resolveSelfCheckEligibilityInputs({
      answers: {},
      inputs: [input],
      paths: ["eligibility.optional_answer"],
    });

    expect(result.values).toEqual({ optional_answer: null });
  });

  it("resolves configured multi-select answers as a JSON list", () => {
    const input = definition("APPLICATION_FORM_FIELD", "regions");
    input.availableIn = ["SELF_CHECK"];
    input.screening = null;
    input.type = "TEXT";
    input.selfCheck = {
      answerType: "MULTI_SELECT",
      explanation: "",
      helpText: "",
      options: [
        { label: "Khomas", value: "khomas" },
        { label: "Oshana", value: "oshana" },
      ],
      prompt: "Select regions",
      required: true,
    };

    const result = resolveSelfCheckEligibilityInputs({
      answers: { regions: ["khomas", "oshana"] },
      inputs: [input],
      paths: ["eligibility.regions"],
    });

    expect(result.values).toEqual({ regions: ["khomas", "oshana"] });
  });
});
