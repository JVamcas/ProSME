import { describe, expect, it } from "vitest";

import {
  buildEligibilityFieldRegistry,
  eligibilityFieldsForExecutionMode,
  type EligibilityFieldRegistryContext,
  type EligibilitySourceDescriptor,
} from "@/modules/eligibility/domain/EligibilityFieldRegistry";
import type {
  EligibilityInputDefinition,
  EligibilityScreeningSourceKind,
} from "@/modules/eligibility/domain/EligibilityInputDefinition";

const id = (suffix: number) =>
  `70000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;

function source(
  sourceKind: EligibilityScreeningSourceKind,
  suffix: number,
  overrides: Partial<EligibilitySourceDescriptor> = {},
): EligibilitySourceDescriptor {
  return {
    availableBeforeEligibility: true,
    fundingCallId: id(90),
    label: `${sourceKind} source`,
    sourceDefinitionId: id(suffix),
    sourceKey: `source_${suffix}`,
    sourceKind,
    sourceVersionId: sourceKind === "FUNDING_CALL_FIELD" ? null : id(80),
    supportedTypes: ["NUMBER"],
    ...overrides,
  };
}

function definition(
  candidate: EligibilitySourceDescriptor,
  suffix: number,
  overrides: Partial<EligibilityInputDefinition> = {},
): EligibilityInputDefinition {
  return {
    availableIn: ["SCREENING"],
    createdAt: new Date("2026-09-22T00:00:00Z"),
    createdBy: id(98),
    groupKey: null,
    groupLabel: null,
    id: id(suffix),
    label: `Input ${suffix}`,
    order: suffix,
    screening: {
      sourceDefinitionId: candidate.sourceDefinitionId,
      sourceKey: candidate.sourceKey,
      sourceKind: candidate.sourceKind,
      sourceVersionId: candidate.sourceVersionId,
      valuePath: "value",
    },
    selfCheck: null,
    stableKey: `input_${suffix}`,
    type: "NUMBER",
    updatedAt: new Date("2026-09-22T00:00:00Z"),
    updatedBy: id(98),
    versionId: id(99),
    ...overrides,
  };
}

function context(
  sources: EligibilitySourceDescriptor[],
): EligibilityFieldRegistryContext {
  return {
    fundingCallId: id(90),
    fundingCallTitle: "Growth Fund",
    sources,
  };
}

describe("binding-driven eligibility field registry", () => {
  it("discovers all supported configured source kinds", () => {
    const kinds: EligibilityScreeningSourceKind[] = [
      "APPLICATION_FORM_FIELD",
      "FUNDING_CALL_FIELD",
      "WORKFLOW_FORM_FIELD",
      "SCREENING_CHECKLIST_ITEM",
      "DOCUMENT_REQUIREMENT_FACT",
      "MANUAL_ASSESSMENT",
      "INTEGRATION_OUTPUT",
    ];
    const sources = kinds.map((kind, index) => source(kind, index + 1));
    const registry = buildEligibilityFieldRegistry({
      contexts: [context(sources)],
      inputs: sources.map((candidate, index) =>
        definition(candidate, index + 10)
      ),
    });

    expect(registry.issues).toEqual([]);
    expect(registry.fields).toHaveLength(kinds.length);
    expect(registry.sources.map((item) => item.sourceKind)).toEqual(kinds);
  });

  it("makes a newly bound compatible form field available without code changes", () => {
    const formField = source("APPLICATION_FORM_FIELD", 1);
    const before = buildEligibilityFieldRegistry({
      contexts: [context([])],
      inputs: [definition(formField, 10)],
    });
    const after = buildEligibilityFieldRegistry({
      contexts: [context([formField])],
      inputs: [definition(formField, 10)],
    });

    expect(before.fields).toEqual([]);
    expect(before.issues[0]?.code).toBe("SOURCE_NOT_BOUND");
    expect(after.fields[0]?.key).toBe("eligibility.input_10");
  });

  it("keeps workflow outputs Screening-only and rejects circular timing", () => {
    const workflowField = source("WORKFLOW_FORM_FIELD", 1);
    const valid = buildEligibilityFieldRegistry({
      contexts: [context([workflowField])],
      inputs: [definition(workflowField, 10)],
    });
    const circular = buildEligibilityFieldRegistry({
      contexts: [context([{ ...workflowField, availableBeforeEligibility: false }])],
      inputs: [definition(workflowField, 10)],
    });

    expect(eligibilityFieldsForExecutionMode(valid.fields, "SELF_CHECK"))
      .toEqual([]);
    expect(eligibilityFieldsForExecutionMode(valid.fields, "SCREENING"))
      .toHaveLength(1);
    expect(circular.issues[0]?.code).toBe("CIRCULAR_SOURCE_REFERENCE");
  });

  it("requires sources shared by every Funding Call binding", () => {
    const formField = source("APPLICATION_FORM_FIELD", 1);
    const secondContext = {
      fundingCallId: id(91),
      fundingCallTitle: "Second Fund",
      sources: [],
    };
    const registry = buildEligibilityFieldRegistry({
      contexts: [context([formField]), secondContext],
      inputs: [definition(formField, 10)],
    });

    expect(registry.fields).toEqual([]);
    expect(registry.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "SOURCE_NOT_BOUND",
        fundingCallId: id(91),
      }),
    ]));
  });

  it("rejects type-incompatible sources and Both-mode gaps", () => {
    const formField = source("APPLICATION_FORM_FIELD", 1, {
      supportedTypes: ["TEXT"],
    });
    const mismatched = buildEligibilityFieldRegistry({
      contexts: [context([formField])],
      inputs: [definition(formField, 10)],
    });
    const selfCheckOnly = definition(formField, 11, {
      availableIn: ["SELF_CHECK"],
      screening: null,
      selfCheck: {
        answerType: "NUMBER",
        explanation: "",
        helpText: "",
        options: [],
        prompt: "Number?",
        required: true,
      },
    });
    const registry = buildEligibilityFieldRegistry({
      contexts: [context([])],
      inputs: [selfCheckOnly],
    });

    expect(mismatched.issues[0]?.code).toBe("SOURCE_TYPE_MISMATCH");
    expect(eligibilityFieldsForExecutionMode(registry.fields, "BOTH"))
      .toEqual([]);
  });
});
