import { describe, expect, it } from "vitest";

import {
  createDefaultWorkflowCommonActions,
  reconcileWorkflowActionBindings,
} from "@/modules/workflows/domain/actions/WorkflowActionBindingPolicy";
import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

function graph() {
  const value = structuredClone(referenceWorkflow);
  const stage = value.stages[0];
  stage.actions.push({
    actionType: "REQUEST_INFORMATION",
    configuration: {
      continuation: "RESUME_SOURCE_TASK",
      deadlineDays: 10,
      editableFieldPaths: ["CLARIFICATION_RESPONSE"],
      expiryAction: "ESCALATE",
      participantScope: "APPLICATION_OWNER_AND_REQUESTER",
      recipientScope: "APPLICATION_OWNER",
      reminderDayOffsets: [3, 7],
    },
    displayOrder: 2,
    enabled: true,
    label: "Request information",
    reasonRequired: false,
    stableKey: "REQUEST_INFORMATION",
  });
  return value;
}

describe("workflow action binding policy", () => {
  it("binds every decision action exclusively to the decision task", () => {
    const previous = graph();
    const next = structuredClone(previous);
    next.stages[0].tasks[0].taskType = "CONTRIBUTING";
    next.stages[0].tasks[0].actionKeys = ["ADVANCE", "REQUEST_INFORMATION"];
    next.stages[0].tasks.push({
      ...next.stages[0].tasks[0],
      actionKeys: [],
      displayOrder: 2,
      stableKey: "DECISION",
      taskType: "STAGE_DECISION",
    });

    const reconciled = reconcileWorkflowActionBindings(previous, next);
    expect(reconciled.stages[0].tasks[0].actionKeys).toEqual([
      "REQUEST_INFORMATION",
    ]);
    expect(reconciled.stages[0].tasks[1].actionKeys).toEqual([
      "ADVANCE",
      "REQUEST_INFORMATION",
    ]);
  });

  it("adds a new common action to all tasks but preserves later removals", () => {
    const previous = structuredClone(referenceWorkflow);
    const withAction = graph();
    const initiallyReconciled = reconcileWorkflowActionBindings(
      previous,
      withAction,
    );
    expect(initiallyReconciled.stages[0].tasks[0].actionKeys).toContain(
      "REQUEST_INFORMATION",
    );

    const removed = structuredClone(initiallyReconciled);
    removed.stages[0].tasks[0].actionKeys = ["ADVANCE"];
    const afterRemoval = reconcileWorkflowActionBindings(
      initiallyReconciled,
      removed,
    );
    expect(afterRemoval.stages[0].tasks[0].actionKeys).toEqual(["ADVANCE"]);
  });

  it("adds all common actions when a new task is created", () => {
    const previous = graph();
    const next = structuredClone(previous);
    next.stages[0].tasks.push({
      ...next.stages[0].tasks[0],
      actionKeys: [],
      displayOrder: 2,
      stableKey: "CONTRIBUTION",
      taskType: "CONTRIBUTING",
    });
    const reconciled = reconcileWorkflowActionBindings(previous, next);
    expect(reconciled.stages[0].tasks[1].actionKeys).toEqual([
      "REQUEST_INFORMATION",
    ]);
  });

  it("auto-binds Return to contributing and decision tasks without duplicating it", () => {
    const previous = graph();
    const next = structuredClone(previous);
    next.stages[0].actions.push(
      createDefaultWorkflowCommonActions().find(
        (action) => action.actionType === "RETURN",
      )!,
    );
    next.stages[0].tasks.push({
      ...next.stages[0].tasks[0],
      stableKey: "CONTRIBUTION",
      taskType: "CONTRIBUTING",
      actionKeys: [],
    });
    const reconciled = reconcileWorkflowActionBindings(previous, next);
    expect(
      reconciled.stages[0].tasks.every((task) =>
        task.actionKeys.includes("RETURN"),
      ),
    ).toBe(true);
    expect(reconcileWorkflowActionBindings(reconciled, reconciled)).toEqual(
      reconciled,
    );
    expect(next.stages[0].actions.at(-1)?.reasonRequired).toBe(false);
  });

  it("creates enabled, valid common-action templates for a new stage", () => {
    const actions = createDefaultWorkflowCommonActions(
      "79e20de0-3558-4d63-90a4-8c9f5125df07",
    );
    expect(actions.map((action) => action.actionType)).toEqual([
      "REQUEST_INFORMATION",
      "PUT_ON_HOLD",
      "RESUME",
      "RETURN",
      "ESCALATE",
    ]);
    expect(actions.every((action) => action.enabled)).toBe(true);
    actions.forEach((action) => {
      expect(workflowActionDefinitionSchema.safeParse(action).success).toBe(
        true,
      );
    });
  });
});
