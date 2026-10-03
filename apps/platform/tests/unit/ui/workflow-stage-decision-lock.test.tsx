// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { workflowProgressFixture as progress } from "../../support/WorkflowProgressFixture";
import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";

afterEach(() => document.body.replaceChildren());

describe("workflow stage decision lock", () => {
  it("locks the decision link until contributing work is complete", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const blockedReason =
      "Complete all contributing tasks before making the stage decision.";
    const lockedProgress = {
      ...progress,
      stages: progress.stages.map((stage) => ({
        ...stage,
        tasks: stage.tasks.map((task) => ({
          ...task,
          blockedReason: task.taskType === "STAGE_DECISION" ? blockedReason : null,
        })),
      })),
    };
    await act(async () => root.render(
      <WorkflowProgressPanel progress={lockedProgress} />,
    ));
    expect(container.querySelector('a[href="/admin/tasks/task-two"]')).toBeNull();
    expect(container.querySelector('[aria-disabled="true"]')?.textContent)
      .toContain("Assessment decision");
    expect(container.textContent).toContain(blockedReason);
    expect(container.querySelector('a[href="/admin/tasks/task-one"]')).not.toBeNull();

    await act(async () => root.render(
      <WorkflowProgressPanel progress={progress} />,
    ));
    expect(container.querySelector('a[href="/admin/tasks/task-two"]')).not.toBeNull();
    expect(container.textContent).not.toContain(blockedReason);
    await act(async () => root.unmount());
  });

});
