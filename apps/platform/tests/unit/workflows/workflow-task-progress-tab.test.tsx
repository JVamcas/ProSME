import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/platform/auth/ServerAuthNavigation", () => ({
  getAuthenticatedPageUser: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirected");
  }),
}));
vi.mock("@/modules/work-queue/WorkQueueHooks", () => ({
  useWorkflowTask: vi.fn(),
  useWorkflowEscalationTracking: vi.fn(() => ({
    data: null,
    isPending: false,
  })),
}));
vi.mock("@/modules/workflows/ui/runtime/useWorkflowCoi", () => ({
  useWorkflowCoi: vi.fn(),
}));
vi.mock("@/modules/applications/ApplicationHooks", () => ({
  useAdminApplicationDetail: vi.fn(() => ({ isPending: true })),
}));
vi.mock("@/modules/work-queue/ui/WorkflowTaskReviewPanel", () => ({
  WorkflowTaskReviewPanel: () => null,
}));
vi.mock("@/modules/workflows/ui/rfi/WorkflowTaskRfiPanel", () => ({
  WorkflowTaskRfiPanel: () => null,
}));
vi.mock("@/modules/workflows/ui/runtime/WorkflowProgressQueryPanel", () => ({
  WorkflowProgressQueryPanel: () => null,
}));
vi.mock("@/modules/workflows/ui/runtime/WorkflowTaskCoiGate", () => ({
  WorkflowTaskCoiGate: () => <p>Conflict declaration required</p>,
}));

import WorkflowTaskPage from "@/app/(operations)/admin/tasks/[id]/page";
import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { useWorkflowTask } from "@/modules/work-queue/WorkQueueHooks";
import { useWorkflowCoi } from "@/modules/workflows/ui/runtime/useWorkflowCoi";
import { WorkflowTaskWorkspace } from "@/modules/work-queue/ui/WorkflowTaskWorkspace";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useWorkflowCoi).mockReturnValue({
    data: { cleared: true },
  } as never);
  vi.mocked(useWorkflowTask).mockReturnValue({
    data: {
      applicationId: "application-id",
      stageName: "Notification, Feedback and Appeals",
      taskName: "Issue outcome",
      taskStatus: "PENDING",
      taskInstanceId: "task-id",
    },
  } as never);
});

describe("task workspace workflow progress", () => {
  it.each([false, true])(
    "passes the workflow read grant (%s) from the page",
    async (allowed) => {
      vi.mocked(getAuthenticatedPageUser).mockResolvedValue({
        status: "active",
        capabilities: new Set([
          permissionCodes.workflowTaskAssignedRead,
          ...(allowed ? [permissionCodes.workflowInstanceAssignedRead] : []),
        ]),
      } as never);

      const page = await WorkflowTaskPage({
        params: Promise.resolve({ id: "task-id" }),
      });

      expect(page.props.canReadWorkflowProgress).toBe(allowed);
    },
  );

  it.each([false, true])(
    "shows the progress tab only with permission (%s)",
    (allowed) => {
      const markup = renderToStaticMarkup(
        <WorkflowTaskWorkspace
          canReadWorkflowProgress={allowed}
          taskId="task-id"
        />,
      );

      expect(markup.includes("Workflow Progress")).toBe(allowed);
      expect(markup).toContain("Assigned Task");
      expect(markup).toContain("Requests for information");
    },
  );

  it("keeps progress behind the conflict of interest gate", () => {
    vi.mocked(useWorkflowCoi).mockReturnValue({
      data: { cleared: false },
    } as never);

    const markup = renderToStaticMarkup(
      <WorkflowTaskWorkspace canReadWorkflowProgress taskId="task-id" />,
    );

    expect(markup).toContain("Conflict declaration required");
    expect(markup).not.toContain("Workflow Progress");
  });
});
