import { describe, expect, it } from "vitest";

import { workflowGraphSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { createStandardWorkflowDraft } from "@/modules/workflows/domain/standard/StandardWorkflowCatalogue";
import {
  standardWorkflowRoleCodes,
  type StandardWorkflowDependencies,
} from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

function dependencies(): StandardWorkflowDependencies {
  return {
    formVersionIds: {
      ELIGIBILITY_VERIFICATION:
        "00000000-0000-4000-9000-000000000001",
    },
    roleIds: Object.fromEntries(
      standardWorkflowRoleCodes.map((code, index) => [
        code,
        `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      ]),
    ) as StandardWorkflowDependencies["roleIds"],
  };
}

describe("standard workflow catalogue", () => {
  it("defines the agreed twelve-stage application workflow", () => {
    const draft = createStandardWorkflowDraft(dependencies());
    const graph = workflowGraphSchema.parse(draft.graph);

    expect(graph.stages).toHaveLength(12);
    expect(graph.stages.filter((stage) => stage.initial).map((stage) => (
      stage.stableKey
    ))).toEqual(["ADMIN_ELIGIBILITY_SCREENING"]);
    expect(graph.stages.map((stage) => stage.stableKey)).not.toContain(
      "APPLICATION_SUBMISSION",
    );
    expect(graph.stages.map((stage) => stage.stableKey)).not.toContain(
      "CALL_SETUP_PUBLICATION",
    );
    expect(graph.stages.every((stage) => (
      stage.tasks.length > 0 && stage.actions.length > 0
    ))).toBe(true);
    expect(validateWorkflowGraph(graph)).toEqual({
      errors: [],
      valid: true,
      warnings: [],
    });
  });

  it("configures the parallel fork and repeatable post-award stages", () => {
    const graph = createStandardWorkflowDraft(dependencies()).graph;
    const forkTargets = graph.transitions
      .filter((transition) => (
        transition.sourceStageKey === "ADMIN_ELIGIBILITY_SCREENING"
        && transition.actionKey === "ELIGIBLE_ADVANCE"
      ))
      .map((transition) => transition.targetStageKey)
      .sort();

    expect(forkTargets).toEqual(["FINANCIAL_REVIEW", "TECHNICAL_ASSESSMENT"]);
    expect(graph.stages.filter((stage) => stage.repeatable).map((stage) => (
      stage.stableKey
    ))).toEqual(["DISBURSEMENT", "IMPLEMENTATION_MONITORING"]);
  });

  it("gates Screening actions with authoritative eligibility outcomes", () => {
    const graph = createStandardWorkflowDraft(dependencies()).graph;
    const screening = graph.stages.find(
      (stage) => stage.stableKey === "ADMIN_ELIGIBILITY_SCREENING",
    )!;
    const task = screening.tasks.find(
      (item) => item.stableKey === "AUTHORITATIVE_ELIGIBILITY",
    )!;
    const prerequisiteTask = screening.tasks.find(
      (item) => item.stableKey === "COMPLETENESS_SCREENING",
    )!;
    const verificationTask = screening.tasks.find(
      (item) => item.stableKey === "ELIGIBILITY_VERIFICATION",
    )!;

    expect(prerequisiteTask.actionKeys).toEqual([]);
    expect(verificationTask).toMatchObject({
      displayOrder: 2,
      formBinding: {
        formVersionId: "00000000-0000-4000-9000-000000000001",
      },
      type: "STRUCTURED_FORM",
    });
    expect(task.displayOrder).toBe(3);
    expect(task.config).toEqual({
      command: "AUTHORITATIVE_ELIGIBILITY",
      reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
    });
    expect(screening.actions.find(
      (action) => action.stableKey === "ELIGIBLE_ADVANCE",
    )?.condition).toMatchObject({
      children: [expect.objectContaining({
        leftOperand: { key: "eligibility.outcome", kind: "FIELD" },
        rightOperand: { kind: "CONSTANT", value: "ELIGIBLE" },
      })],
    });
    expect(screening.actions.find(
      (action) => action.stableKey === "INELIGIBLE_REJECT",
    )?.condition).toMatchObject({
      children: [expect.objectContaining({
        rightOperand: { kind: "CONSTANT", value: "INELIGIBLE" },
      })],
    });
    expect(screening.actions.find(
      (action) => action.stableKey === "MANUAL_ELIGIBILITY_ADVANCE",
    )).toMatchObject({ reasonCodeRequired: true });
  });
});
