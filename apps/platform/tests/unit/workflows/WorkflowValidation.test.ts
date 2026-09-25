import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { workflowGraphSchema } from "@/modules/workflows/api/WorkflowSchemas";
import {
  taskRunsAuthoritativeEligibility,
  taskWorkIsReady,
  validateTaskConfiguration,
} from "@/modules/workflows/WorkflowTaskRegistry";

const eligibility = {
  command: "AUTHORITATIVE_ELIGIBILITY",
  reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
};

describe("workflow task configuration", () => {
  it("accepts independently configured work parts on one task", () => {
    const config = eligibility;
    expect(validateTaskConfiguration(config).success).toBe(true);
    expect(taskRunsAuthoritativeEligibility(config)).toBe(true);
    expect(workflowGraphSchema.safeParse(referenceWorkflow).success).toBe(true);
  });

  it("requires each configured part before a decision completes the task", () => {
    const config = eligibility;
    const result = {
      items: [{ code: "ONE", accepted: true }],
      eligible: true,
      evaluationId: "79e20de0-3558-4d63-90a4-8c9f5125df06",
      evaluationNumber: 1,
      hardFailureCount: 0,
      manualScreeningRequired: false,
      outcome: "ELIGIBLE",
      softFailureCount: 0,
      warningCount: 0,
    };
    expect(taskWorkIsReady({
      config,
      formCompleted: true,
      formRequired: true,
      hasChecklist: true,
      result,
    })).toBe(true);
    expect(taskWorkIsReady({
      config,
      formCompleted: false,
      formRequired: true,
      hasChecklist: true,
      result,
    })).toBe(false);
    expect(taskWorkIsReady({
      config,
      formCompleted: true,
      formRequired: true,
      hasChecklist: true,
      result: { items: result.items },
    })).toBe(false);
  });

  it("requires every assigned prompt and its mandatory answer", () => {
    const config = {
      commentFields: [
        {
          key: "RECOMMENDATION",
          label: "Recommendation",
          helpText: "Explain the decision.",
          mandatory: true,
          visibility: "INTERNAL_ONLY",
          displayOrder: 1,
        },
      ],
    };
    const work = {
      config,
      formCompleted: false,
      formRequired: false,
      hasChecklist: false,
    };
    expect(taskWorkIsReady({ ...work, result: null })).toBe(false);
    expect(taskWorkIsReady({
      ...work,
      result: { comments: [{ key: "RECOMMENDATION", value: "" }] },
    })).toBe(false);
    expect(taskWorkIsReady({
      ...work,
      result: { comments: [{ key: "RECOMMENDATION", value: "Approve" }] },
    })).toBe(true);
  });

  it("rejects invalid configured work and unbound transitions", () => {
    expect(validateTaskConfiguration({ criteria: [] }).success).toBe(false);
    expect(validateTaskConfiguration({ command: "AUTHORITATIVE_ELIGIBILITY" }).success).toBe(false);
    const graph = structuredClone(referenceWorkflow) as unknown as {
      transitions: Array<Record<string, unknown>>;
    };
    graph.transitions[0].actionKey = "ARBITRARY_ACTION";
    expect(workflowGraphSchema.safeParse(graph).success).toBe(false);
  });
});
