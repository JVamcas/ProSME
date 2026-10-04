import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkflowStageTaskAssignments } from "@/modules/workflows/ui/WorkflowStageTaskAssignments";
import type { WorkflowProgressTask } from "@/modules/workflows/api/WorkflowProgressTypes";

const task: WorkflowProgressTask = {
  id: "task-id", name: "Review", taskType: "CONTRIBUTING", status: "PENDING",
  canOpen: false, actionedAt: null, dueAt: null, assignedRoleName: null,
  assignedUserName: "Reviewer", assignedUserEmail: null, required: true,
};

describe("task assignment links", () => {
  it.each([false, true])("honors the server's task read access (%s)", (canOpen) => {
    const markup = renderToStaticMarkup(<WorkflowStageTaskAssignments tasks={[{ ...task, canOpen }]} />);
    expect(markup.includes('/admin/tasks/task-id')).toBe(canOpen);
  });

  it("allows an authorized oversight link when processing prerequisites are incomplete", () => {
    const markup = renderToStaticMarkup(<WorkflowStageTaskAssignments tasks={[{
      ...task, canOpen: true, blockedReason: "Complete contributing tasks first.",
    }]} />);
    expect(markup).toContain('/admin/tasks/task-id');
  });

  it("keeps planned tasks without runtime instances unlinked", () => {
    const markup = renderToStaticMarkup(<WorkflowStageTaskAssignments tasks={[{
      ...task, canOpen: true, planned: true,
    }]} />);
    expect(markup).not.toContain('/admin/tasks/task-id');
  });
});
