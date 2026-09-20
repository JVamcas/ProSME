import { describe, expect, it } from "vitest";

import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { workflowGraphSchema } from "@/modules/workflows/api/WorkflowSchemas";
import {
  handleTaskResult,
  listTaskRegistryEntries,
  validateTaskConfiguration,
  validateTaskResult,
} from "@/modules/workflows/WorkflowTaskRegistry";
import type { TaskTypeCode } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

const samples: Record<TaskTypeCode, { config: unknown; result: unknown }> = {
  AUTOMATED_RULE_CHECK: {
    config: {
      rulesetCode: "RULES",
      ruleVersion: 1,
      inputs: ["amount"],
      categories: [{ code: "OK", label: "Okay" }],
    },
    result: { category: "OK", reasons: [], ruleVersion: 1 },
  },
  CHECKLIST: {
    config: { items: [{ code: "ONE", label: "One", required: true }] },
    result: { items: [{ code: "ONE", accepted: true }] },
  },
  DOCUMENT_REVIEW: {
    config: {
      categories: [{ code: "ID", label: "ID" }],
      outcomes: [{ code: "OK", label: "Accepted" }],
    },
    result: { decisions: [{ category: "ID", outcome: "OK" }] },
  },
  STRUCTURED_FORM: {
    config: { fields: [{ code: "NOTES", label: "Notes", type: "textarea" }] },
    result: { values: { NOTES: "Complete" } },
  },
  ASSESSMENT_FORM: {
    config: {
      criteria: [
        { code: "IMPACT", label: "Impact", maximumScore: 10, weight: 1 },
      ],
    },
    result: { scores: { IMPACT: 8 }, weightedTotal: 8, comments: {} },
  },
  FINANCE_REVIEW: {
    config: {
      fields: [{ code: "NOTES", label: "Notes", type: "textarea" }],
      recommendations: [{ code: "OK", label: "Proceed" }],
    },
    result: { values: { NOTES: "Sound" }, recommendation: "OK" },
  },
  INFORMATION_REQUEST: {
    config: {
      categories: [{ code: "FINANCE", label: "Finance" }],
      responseRequired: true,
      templateReference: "INFO",
    },
    result: {
      requestId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      outcome: "ACCEPTED",
    },
  },
  RECOMMENDATION: {
    config: {
      options: [{ code: "PROCEED", label: "Proceed" }],
      rationaleRequired: true,
    },
    result: { recommendation: "PROCEED", rationale: "Strong application" },
  },
  DECISION: {
    config: {
      outcomes: [{ code: "APPROVE", label: "Approve" }],
      authorityCapability: "application.decide",
      rationaleRequired: true,
    },
    result: {
      decision: "APPROVE",
      rationale: "Approved",
      authoritySnapshot: "panel",
    },
  },
  COMMUNICATION: {
    config: {
      template: "OUTCOME",
      channel: "EMAIL",
      audience: "APPLICANT",
      trigger: "DECISION",
    },
    result: {
      outboxId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      deliveryState: "PENDING",
    },
  },
};

describe("workflow task registry", () => {
  it("registers typed configuration, result, renderer and handler contracts", () => {
    const entries = listTaskRegistryEntries();
    expect(entries).toHaveLength(10);
    entries.forEach((entry) => {
      expect(entry.allowedActions.length).toBeGreaterThan(0);
      expect(entry.requiredCapabilities.length).toBeGreaterThan(0);
      expect(entry.rendererKey).toBeTruthy();
      expect(entry.handlerKey).toBeTruthy();
      expect(entry.handler).toBeTypeOf("function");
      expect(
        validateTaskConfiguration(entry.type, samples[entry.type].config)
          .success,
      ).toBe(true);
      expect(
        validateTaskResult(entry.type, samples[entry.type].result).success,
      ).toBe(true);
      expect(
        handleTaskResult(entry.type, samples[entry.type].result),
      ).toBeDefined();
    });
  });

  it("rejects invalid type-specific payloads", () => {
    expect(
      validateTaskConfiguration("ASSESSMENT_FORM", { criteria: [] }).success,
    ).toBe(false);
    expect(
      validateTaskResult("DECISION", { decision: "APPROVE" }).success,
    ).toBe(false);
  });

  it("rejects transitions that do not reference a configured action", () => {
    const graph = structuredClone(referenceWorkflow) as unknown as {
      transitions: Array<Record<string, unknown>>;
    };
    graph.transitions[0].actionKey = "ARBITRARY_ACTION";
    expect(workflowGraphSchema.safeParse(graph).success).toBe(false);
  });
});

describe("workflow graph validation", () => {
  it("requires assignments before publishing the reference workflow", () => {
    const validation = validateWorkflowGraph(referenceWorkflow);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_ASSIGNMENT" }),
      ]),
    );
    const assigned = structuredClone(referenceWorkflow);
    assigned.stages.forEach((stage) => {
      stage.tasks.forEach((task) => {
        task.roleId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
      });
    });
    expect(validateWorkflowGraph(assigned)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it("rejects invalid repeatable references and invalid stage configuration", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[1].publicStatusMapping.label = "Committee score assigned";
    graph.stages[1].tasks[0].config = { items: [] };
    graph.transitions[4].targetStageKey = "COMPLETENESS";
    const validation = validateWorkflowGraph(graph);
    expect(validation.valid).toBe(false);
    expect(validation.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "INVALID_TASK_CONFIG",
        "UNSAFE_APPLICANT_LABEL",
        "INVALID_REPEATABLE_REFERENCE",
      ]),
    );
  });

  it("accepts a loop only when every referenced stage is repeatable", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[1].repeatable = true;
    graph.stages[2].repeatable = true;
    graph.stages[3].repeatable = true;
    graph.stages[4].repeatable = true;
    graph.transitions[4].targetStageKey = "COMPLETENESS";

    expect(
      validateWorkflowGraph(graph).errors.some(
        (error) => error.code === "INVALID_REPEATABLE_REFERENCE",
      ),
    ).toBe(false);
  });

  it("rejects duplicate stage keys, unreachable stages and missing responsibility", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[1].stableKey = graph.stages[0].stableKey;
    graph.stages[2].tasks = [];
    graph.transitions = graph.transitions.filter(
      (transition) => transition.targetStageKey !== "FINANCE_REVIEW",
    );

    const codes = validateWorkflowGraph(graph).errors.map(
      (error) => error.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_STAGE_CODE",
        "UNREACHABLE_STAGE",
        "MISSING_RESPONSIBILITY",
      ]),
    );
  });

  it("rejects a terminal stage without a terminal decision", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions.pop();

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "TERMINAL_STAGE_WITHOUT_DECISION",
          path: "stages.5",
        }),
      ]),
    );
  });

  it("supports multiple prioritized targets for one configured action", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions.push({
      sourceStageKey: "PRE_SCREENING",
      actionKey: "ADVANCE",
      targetStageKey: "TECHNICAL_ASSESSMENT",
      priority: 2,
      condition: null,
    });
    expect(workflowGraphSchema.safeParse(graph).success).toBe(true);
  });

  it("rejects duplicate priorities for the same source action", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.transitions.push({
      sourceStageKey: "PRE_SCREENING",
      actionKey: "ADVANCE",
      targetStageKey: "TECHNICAL_ASSESSMENT",
      priority: 1,
      condition: null,
    });
    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_TRANSITION_PRIORITY" }),
      ]),
    );
  });

});
