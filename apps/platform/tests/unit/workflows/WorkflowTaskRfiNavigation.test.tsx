// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowRfiDetail } from "@/modules/workflows/domain/runtime/WorkflowRfiView";

const mocks = vi.hoisted(() => ({
  coi: vi.fn(),
  task: vi.fn(),
  list: vi.fn(),
  detail: vi.fn(),
}));
vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useWorkflowTask: mocks.task,
  useWorkflowEscalationTracking: () => ({ isPending: false, data: null }),
}));
vi.mock("@/modules/workflows/ui/runtime/useWorkflowCoi", () => ({
  useWorkflowCoi: mocks.coi,
}));
vi.mock("@/modules/work-queue/ui/WorkflowTaskReviewPanel", () => ({
  WorkflowTaskReviewPanel: () => <p>Assigned task work</p>,
}));
vi.mock("@/modules/workflows/ui/runtime/WorkflowTaskCoiGate", () => ({
  WorkflowTaskCoiGate: () => <p>COI declaration required</p>,
}));
vi.mock("@/modules/workflows/ui/rfi/useWorkflowRfi", () => ({
  useTaskWorkflowRfis: mocks.list,
  useTaskWorkflowRfi: mocks.detail,
  useCloseWorkflowRfi: () => ({ mutate: vi.fn(), isPending: false }),
  useFollowUpWorkflowRfi: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { WorkflowTaskWorkspace } from "@/modules/work-queue/ui/WorkflowTaskWorkspace";
import { StaffApplicationRfiTimeline } from "@/modules/workflows/ui/rfi/WorkflowRfiPresentation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const request: WorkflowRfiDetail = {
  id: "selected-request",
  taskId: "task",
  applicationId: "application",
  applicationReference: "APP-1",
  applicationTitle: "Funding",
  createdAt: "2026-10-05T09:00:00Z",
  deadlineAt: "2026-10-12T09:00:00Z",
  question: "Explain the budget",
  instructions: "Provide supporting details",
  isOverdue: false,
  respondedAt: null,
  rowVersion: 1,
  status: "OPEN",
  closedAt: null,
  expiredAt: null,
  correspondence: [],
  draft: null,
  editableFields: [],
  requestedDocuments: [],
  response: null,
  stageName: "Assessment",
  taskName: "Decision",
};
let root: Root | undefined;
beforeEach(() => {
  mocks.coi.mockReturnValue({ data: { cleared: true } });
  mocks.task.mockReturnValue({
    data: {
      taskStatus: "PENDING",
      taskName: "Decision",
      stageName: "Assessment",
    },
  });
  mocks.list.mockReturnValue({
    data: [{ ...request, id: "other-request" }, request],
  });
  mocks.detail.mockReturnValue({ data: request });
});
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  vi.clearAllMocks();
  document.body.replaceChildren();
});

async function render(canManage = false) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <WorkflowTaskWorkspace
        canCloseRfi={canManage}
        canFollowUpRfi={canManage}
        initialRequestId={request.id}
        taskId="task"
      />,
    ),
  );
  return container;
}

describe("task RFI navigation", () => {
  it("links an application RFI to its specific request in the task workspace", () => {
    const markup = renderToStaticMarkup(
      <StaffApplicationRfiTimeline requests={[request]} />,
    );
    expect(markup).toContain(
      'href="/admin/tasks/task?requestId=selected-request"',
    );
    expect(markup).toContain("View request");
  });

  it("opens the requested RFI with details and authorized follow-up and close controls", async () => {
    const container = await render(true);
    expect(mocks.detail).toHaveBeenCalledWith("task", request.id);
    expect(container.textContent).toContain("Explain the budget");
    expect(container.textContent).toContain(
      "Awaiting the applicant's response",
    );
    expect(container.textContent).toContain("Close request");
    expect(container.textContent).toContain("Send follow-up");
  });

  it("hides mutation controls without their canonical permissions", async () => {
    const container = await render();
    expect(container.textContent).toContain("Explain the budget");
    expect(container.textContent).not.toContain("Close request");
    expect(container.textContent).not.toContain("Send follow-up");
  });

  it("keeps request details behind the COI gate", async () => {
    mocks.coi.mockReturnValue({ data: { cleared: false } });
    const container = await render(true);
    expect(container.textContent).toContain("COI declaration required");
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.detail).not.toHaveBeenCalled();
  });

  it("keeps an assignee's read-only RFI history accessible without mutation controls", async () => {
    mocks.task.mockReturnValue({
      data: {
        readOnly: true,
        taskStatus: "COMPLETED",
        taskName: "Decision",
        stageName: "Assessment",
      },
    });
    const container = await render(true);
    expect(container.textContent).toContain("Explain the budget");
    expect(container.textContent).not.toContain("Close request");
    expect(container.textContent).not.toContain("Send follow-up");
  });
});
