import { describe, expect, it } from "vitest";

import {
  checklistItemDefaults,
  workflowTaskFormSchema,
} from "@/components/admin/workflows/WorkflowTaskFormSchema";
import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
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

  it("rejects a task assigned to both a role and a named user", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].tasks[0].assignmentRoleId =
      "79e20de0-3558-4d63-90a4-8c9f5125df07";
    graph.stages[0].tasks[0].assignmentUserId =
      "79e20de0-3558-4d63-90a4-8c9f5125df08";
    const validation = validateWorkflowGraph(graph);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "AMBIGUOUS_ASSIGNMENT" }),
      ]),
    );
  });

  it("requires each edited task to select a role or a named user", () => {
    const values = {
      assignmentMode: "ROLE",
      assignmentTarget: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      code: "REVIEW_TASK",
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
      workflowTaskFormSchema.safeParse({ ...values, assignmentTarget: "" })
        .success,
    ).toBe(false);
    expect(
      workflowTaskFormSchema.safeParse({ ...values, assignmentMode: "INHERIT" })
        .success,
    ).toBe(false);
  });
});
