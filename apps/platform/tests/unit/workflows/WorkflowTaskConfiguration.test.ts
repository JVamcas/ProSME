import { describe, expect, it } from "vitest";

import {
  checklistItemDefaults,
  workflowTaskFormSchema,
} from "@/modules/workflows/ui/definitions/WorkflowTaskFormSchema";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import {
  defaultTaskConfiguration,
  formatTaskConfiguration,
} from "@/modules/workflows/WorkflowTaskConfiguration";
import {
  listTaskRegistryEntries,
  validateTaskConfiguration,
} from "@/modules/workflows/WorkflowTaskRegistry";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

describe("workflow task configuration", () => {
  it("provides a valid editable starting configuration for every task type", () => {
    listTaskRegistryEntries().forEach((entry) => {
      expect(
        validateTaskConfiguration(
          entry.type,
          defaultTaskConfiguration(entry.type),
        ).success,
      ).toBe(true);
    });
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
      assignmentMode: "ROLE",
      assignmentTarget: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      stableKey: "REVIEW_TASK",
      description: "Review the application.",
      displayOrder: 1,
      reviewerCount: 3,
      requiredCompletionCount: 2,
      quorum: true,
      coiRequired: true,
      configJson: formatTaskConfiguration(
        defaultTaskConfiguration("CHECKLIST"),
      ),
      checklistItems: checklistItemDefaults(
        defaultTaskConfiguration("CHECKLIST"),
      ),
      name: "Review task",
      required: true,
      type: "CHECKLIST",
    };
    expect(workflowTaskFormSchema.safeParse(values).success).toBe(true);
    expect(
      workflowTaskFormSchema.safeParse({
        ...values,
        formVersionId: "",
        type: undefined,
      }).success,
    ).toBe(true);
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
});
