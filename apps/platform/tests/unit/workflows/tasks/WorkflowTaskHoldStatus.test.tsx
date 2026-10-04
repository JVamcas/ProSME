// @vitest-environment happy-dom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { WorkflowHoldSummary } from "@/modules/workflows/domain/runtime/WorkflowHold";
import { WorkflowTaskHoldStatus } from "@/modules/workflows/ui/tasks/WorkflowTaskHoldStatus";

const holds: WorkflowHoldSummary[] = [
  {
    id: "task-hold",
    scope: "TASK",
    heldAt: "2026-10-04T08:00:00.000Z",
    heldBy: "Reviewer",
    reason: "Awaiting supporting documents.",
    reviewAt: "2026-10-15T00:00:00.000Z",
  },
  {
    id: "stage-hold",
    scope: "STAGE",
    heldAt: "2026-10-04T08:00:00.000Z",
    heldBy: "Coordinator",
    reason: null,
    reviewAt: null,
  },
];

describe("workflow task hold status", () => {
  it("starts collapsed with a visible status and keeps all hold details available", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <WorkflowTaskHoldStatus holds={holds} />,
    );

    const disclosure = container.querySelector("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.querySelector("summary")?.textContent).toBe(
      "On hold · SLA paused",
    );
    expect(disclosure?.textContent).toContain("This task · Placed by Reviewer");
    expect(disclosure?.textContent).toContain("Awaiting supporting documents.");
    expect(disclosure?.textContent).toContain("Automatic resumption:");
    expect(disclosure?.textContent).toContain("This stage · Placed by Coordinator");
    expect(disclosure?.textContent).toContain("Manual resumption required");
  });

  it("renders nothing when there are no active holds", () => {
    expect(renderToStaticMarkup(<WorkflowTaskHoldStatus holds={[]} />)).toBe("");
  });
});
