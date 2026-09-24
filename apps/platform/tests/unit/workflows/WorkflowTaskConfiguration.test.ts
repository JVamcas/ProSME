import { describe, expect, it } from "vitest";

import {
  checklistItemDefaults,
  workflowTaskFormSchema,
} from "@/modules/workflows/ui/definitions/WorkflowTaskFormSchema";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { formatTaskConfiguration } from "@/modules/workflows/WorkflowTaskConfiguration";
import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

describe("workflow task configuration", () => {
  it("accepts a task with a form and checklist configuration", () => {
    expect(validateTaskConfiguration({
      items: [{ code: "ONE", label: "One", required: true }],
    }).success).toBe(true);
  });

  it("rejects completion thresholds above the reviewer count", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].tasks[0].roleId =
      "79e20de0-3558-4d63-90a4-8c9f5125df07";
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
      assignmentMode: "ROLE",
      assignmentTarget: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      contextFields: [],
      stableKey: "REVIEW_TASK",
      description: "Review the application.",
      displayOrder: 1,
      formVersionId: "",
      reviewerCount: 3,
      requiredCompletionCount: 2,
      quorum: true,
      coiRequired: true,
      configJson: formatTaskConfiguration(
        { items: [{ code: "ONE", label: "One", required: true }] },
      ),
      checklistItems: checklistItemDefaults(
        { items: [{ code: "ONE", label: "One", required: true }] },
      ),
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
    expect(
      workflowTaskFormSchema.safeParse({
        ...values,
        requiredCompletionCount: 4,
      }).success,
    ).toBe(false);
  });

  it("allows a structured task to use its configuration without a form", () => {
    const graph = structuredClone(referenceWorkflow);
    const task = graph.stages[0].tasks[0];
    task.roleId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
    task.config = { fields: [{ code: "NOTES", label: "Notes", type: "textarea" }] };
    task.formBinding = null;

    expect(validateWorkflowGraph(graph).errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_FORM_VERSION" }),
      ]),
    );
  });
});
