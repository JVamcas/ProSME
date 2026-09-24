// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { WorkflowProgressView } from "@/modules/workflows/api/WorkflowProgressTypes";
import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";

const progress: WorkflowProgressView = {
  completedAt: null,
  id: "workflow-one",
  name: "SME Funding Workflow",
  stages: [
    {
      activatedAt: "2026-09-20T08:00:00.000Z",
      completedAt: "2026-09-20T10:00:00.000Z",
      description: "Check the application.",
      id: "stage-one",
      iterationNumber: 1,
      name: "Eligibility",
      sequence: 1,
      status: "COMPLETED",
      tasks: [],
    },
    {
      activatedAt: "2026-09-21T08:00:00.000Z",
      completedAt: null,
      description: "Assess the proposal.",
      id: "stage-two",
      iterationNumber: 1,
      name: "Technical Assessment",
      sequence: 2,
      status: "ACTIVE",
      tasks: [{
        dueAt: null,
        id: "task-one",
        name: "Review proposal",
        status: "IN_PROGRESS",
      }],
    },
  ],
  startedAt: "2026-09-20T08:00:00.000Z",
  status: "ACTIVE",
  terminalOutcome: null,
  versionNumber: 2,
};

afterEach(() => document.body.replaceChildren());

describe("workflow progress panel", () => {
  it("selects the active stage and lets staff inspect another stage", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<WorkflowProgressPanel progress={progress} />));

    const details = container.querySelector('[aria-label="Selected stage details"]');
    expect(details?.textContent).toContain("Technical Assessment");
    expect(details?.textContent).toContain("Review proposal");

    const eligibility = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Eligibility"),
    );
    await act(async () => eligibility?.click());

    expect(details?.textContent).toContain("Check the application.");
    expect(details?.textContent).not.toContain("Review proposal");
    await act(async () => root.unmount());
  });
});
