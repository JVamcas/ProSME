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
    formVersionIds: {},
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
});

