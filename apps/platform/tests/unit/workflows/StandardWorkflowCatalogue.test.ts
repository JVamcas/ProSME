import { describe, expect, it } from "vitest";

import { workflowGraphSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { createStandardWorkflowDraft } from "@/modules/workflows/domain/standard/StandardWorkflowCatalogue";
import {
  standardWorkflowRoleCodes,
  type StandardWorkflowDependencies,
} from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import { validateWorkflowConditions } from "@/modules/workflows/engine/WorkflowConditionValidation";
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
      .flatMap((transition) => transition.targetStageKeys)
      .sort();

    expect(forkTargets).toEqual(["FINANCIAL_REVIEW", "TECHNICAL_ASSESSMENT"]);
    expect(
      graph.stages.find((stage) => stage.stableKey === "DUE_DILIGENCE_RISK")
        ?.joinPredecessorStageKeys,
    ).toEqual(["TECHNICAL_ASSESSMENT", "FINANCIAL_REVIEW"]);
    expect(graph.stages.filter((stage) => stage.repeatable).map((stage) => (
      stage.stableKey
    ))).toEqual([
      "TECHNICAL_ASSESSMENT",
      "COMMITTEE_REVIEW",
      "APPROVAL_AWARD_DECISION",
      "DISBURSEMENT",
      "IMPLEMENTATION_MONITORING",
    ]);
  });

  it("configures close-out as a checklist without a scoring requirement", () => {
    const graph = createStandardWorkflowDraft(dependencies()).graph;
    const closeOut = graph.stages.find(
      (stage) => stage.stableKey === "EVALUATION_CLOSE_OUT",
    );
    const review = closeOut?.tasks.find(
      (task) => task.stableKey === "EVALUATION_CLOSE_OUT_REVIEW",
    );

    expect(closeOut?.checklistItems).toHaveLength(4);
    expect(closeOut?.scoring).toBeNull();
    expect(review?.config).not.toHaveProperty("criteria");
  });

  it("includes enabled common actions on every stage and task", () => {
    const graph = createStandardWorkflowDraft(dependencies()).graph;
    const commonActionKeys = [
      "REQUEST_INFORMATION",
      "REFER",
      "PUT_ON_HOLD",
      "ESCALATE",
    ];

    for (const stage of graph.stages) {
      const actionsByKey = new Map(
        stage.actions.map((action) => [action.stableKey, action]),
      );
      for (const actionKey of commonActionKeys) {
        expect(actionsByKey.get(actionKey)).toMatchObject({ enabled: true });
      }
      for (const task of stage.tasks) {
        expect(task.actionKeys).toEqual(
          expect.arrayContaining(commonActionKeys),
        );
      }
    }
  });

  it("keeps screening decisions independent of the evaluation result", () => {
    const graph = createStandardWorkflowDraft(dependencies()).graph;
    const screening = graph.stages.find(
      (stage) => stage.stableKey === "ADMIN_ELIGIBILITY_SCREENING",
    )!;
    const task = screening.tasks.find(
      (item) => item.stableKey === "AUTHORITATIVE_ELIGIBILITY",
    )!;

    expect(screening.tasks).toHaveLength(2);
    expect(task).toMatchObject({
      actionKeys: [
        "ELIGIBLE_ADVANCE",
        "INELIGIBLE_REJECT",
        "REQUEST_INFORMATION",
        "REFER",
        "PUT_ON_HOLD",
        "RESUME",
        "ESCALATE",
      ],
      config: {
        command: "AUTHORITATIVE_ELIGIBILITY",
        formPurpose: "ELIGIBILITY_VERIFICATION",
        reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
      },
      displayOrder: 2,
      formBinding: {
        formVersionId: "00000000-0000-4000-9000-000000000001",
      },
    });
    expect(screening.actions.every((action) => !action.condition)).toBe(true);
  });

  it("validates eligibility conditions without requiring a task form", () => {
    const graph = createStandardWorkflowDraft(dependencies()).graph;

    expect(validateWorkflowConditions(graph, new Map())).toEqual([]);
  });
});
