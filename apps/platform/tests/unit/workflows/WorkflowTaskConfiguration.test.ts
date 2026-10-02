import { describe, expect, it } from "vitest";

import { workflowTaskFormSchema } from "@/modules/workflows/ui/definitions/WorkflowTaskFormSchema";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import {
  eligibilityCommandSchema,
  taskRunsAuthoritativeEligibility,
  validateTaskConfiguration,
} from "@/modules/workflows/WorkflowTaskRegistry";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

describe("workflow task configuration", () => {
  it("resolves the command for older eligibility verification forms", () => {
    const config = eligibilityCommandSchema.parse({
      formPurpose: "ELIGIBILITY_VERIFICATION",
    });
    expect(config).toEqual({
      command: "AUTHORITATIVE_ELIGIBILITY",
      hardFailureStatus: "INELIGIBLE",
      reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
    });
    expect(
      taskRunsAuthoritativeEligibility({ formPurpose: "APPLICATION_REVIEW" }),
    ).toBe(false);
  });

  it("preserves explicit eligibility policies and rejects invalid commands", () => {
    const config = eligibilityCommandSchema.parse({
      formPurpose: "ELIGIBILITY_VERIFICATION",
      reevaluationPolicy: "NEVER",
    });
    expect(config.reevaluationPolicy).toBe("NEVER");
    expect(
      taskRunsAuthoritativeEligibility({
        formPurpose: "ELIGIBILITY_VERIFICATION",
        command: "UNSUPPORTED",
      }),
    ).toBe(false);
  });

  it("rejects legacy checklist configuration embedded in a task", () => {
    expect(
      validateTaskConfiguration({
        items: [{ code: "ONE", label: "One", required: true }],
      }).success,
    ).toBe(false);
  });

  it("rejects completion thresholds above the reviewer count", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].tasks[0].roleId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
    graph.stages[0].tasks[0].requiredCompletionCount = 2;
    const validation = validateWorkflowGraph(graph);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_COMPLETION_COUNT" }),
      ]),
    );
  });

  it("requires each edited task to select a role or a named user", () => {
    const values = {
      actionKeys: ["ADVANCE"],
      viewPermission: defaultWorkflowElementPermissions.view,
      editPermission: defaultWorkflowElementPermissions.edit,
      decidePermission: defaultWorkflowElementPermissions.decide,
      visibility: defaultWorkflowElementPermissions.visibility,
      taskType: "CONTRIBUTING",
      assignmentMode: "ROLE",
      assignmentTarget: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      contextFields: [],
      stableKey: "REVIEW_TASK",
      description: "Review the application.",
      displayMode: "STEP_PROGRESS",
      displayOrder: 1,
      formVersionId: "",
      formPurpose: "APPLICATION_REVIEW",
      hardFailureStatus: "INELIGIBLE",
      reviewerCount: 3,
      requiredCompletionCount: 2,
      completionMode: "COUNT",
      reviewRelease: "STAGE_COMPLETED",
      submittedReplacementPolicy: "DENY",
      completionPercentage: null,
      quorum: true,
      quorumMinimumCount: 2,
      quorumMinimumPercentage: null,
      name: "Review task",
      required: true,
    };
    expect(workflowTaskFormSchema.safeParse(values).success).toBe(true);
    expect(
      workflowTaskFormSchema.safeParse({ ...values, assignmentTarget: "" })
        .success,
    ).toBe(false);
    expect(
      workflowTaskFormSchema.safeParse({ ...values, assignmentMode: "INHERIT" })
        .success,
    ).toBe(false);
  });

  it("allows a structured task to use its configuration without a form", () => {
    const graph = structuredClone(referenceWorkflow);
    const task = graph.stages[0].tasks[0];
    task.roleId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
    task.config = {
      fields: [{ code: "NOTES", label: "Notes", type: "textarea" }],
    };
    task.formBinding = null;

    expect(validateWorkflowGraph(graph).errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_FORM_VERSION" }),
      ]),
    );
  });

  it("allows at most one stage-decision task per stage", () => {
    const graph = structuredClone(referenceWorkflow);
    const existing = graph.stages[0].tasks[0];
    graph.stages[0].tasks.push({
      ...existing,
      displayOrder: existing.displayOrder + 1,
      stableKey: "SECOND_DECISION",
    });

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MULTIPLE_STAGE_DECISION_TASKS" }),
      ]),
    );
  });

  it("requires a stage-decision task to have one assignee", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].tasks[0].reviewerCount = 2;

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_STAGE_DECISION_REVIEWER_COUNT",
        }),
      ]),
    );
  });

  it("rejects stage-decision actions on contributing tasks", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].tasks[0].taskType = "CONTRIBUTING";

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DECISION_ACTION_ON_CONTRIBUTING_TASK",
        }),
      ]),
    );
  });

  it("requires every stage decision action on the stage-decision task", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].actions.push({
      ...graph.stages[0].actions[0],
      displayOrder: 2,
      label: "Reject",
      stableKey: "REJECT",
    });

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "STAGE_DECISION_ACTION_BINDING_REQUIRED",
        }),
      ]),
    );
  });

  it("requires a decision action on a stage-decision task", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].tasks[0].actionKeys = [];

    expect(validateWorkflowGraph(graph).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "STAGE_DECISION_ACTION_REQUIRED" }),
      ]),
    );
  });
});
