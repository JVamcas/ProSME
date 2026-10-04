import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
  redirect: vi.fn(() => {
    throw new Error("redirected");
  }),
}));
vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/modules/applications/ServerAdminApplicationDetailService", () => ({
  getAdminApplicationDetail: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowProgressService",
  () => ({
    getWorkflowProgress: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService",
  () => ({
    listContextualApplicationRfis: vi.fn(),
  }),
);
vi.mock("@/modules/applications/ui/ApplicationDetailView", () => ({
  ApplicationDetailView: () => null,
}));
vi.mock("@/modules/workflows/ui/WorkflowProgressPanel", () => ({
  WorkflowProgressPanel: () => null,
}));

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import ApplicationPage from "@/app/(operations)/admin/applications/[id]/page";
import { getAdminApplicationDetail } from "@/modules/applications/ServerAdminApplicationDetailService";
import { getWorkflowProgress } from "@/modules/workflows/application/runtime/ServerWorkflowProgressService";
import { listContextualApplicationRfis } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

const applicationId = "11111111-1111-4111-8111-111111111111";
const actor: AuthenticatedUser = {
  capabilities: new Set(),
  createdAt: new Date(),
  displayName: "Staff member",
  email: "staff@example.test",
  id: "22222222-2222-4222-8222-222222222222",
  identitySubject: "staff",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminApplicationDetail).mockResolvedValue({
    model: { title: "Application" },
    overview: {},
  } as never);
  vi.mocked(getWorkflowProgress).mockResolvedValue(null);
  vi.mocked(listContextualApplicationRfis).mockResolvedValue([]);
});

describe("staff application workflow progress tab", () => {
  it("omits the tab and does not read progress for an ordinary application reader", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...actor,
      capabilities: new Set([permissionCodes.fundingApplicationAllRead]),
    });

    const page = await ApplicationPage({
      params: Promise.resolve({ id: applicationId }),
    });

    expect(page.props.canReadWorkflow).toBe(false);
    expect(getWorkflowProgress).not.toHaveBeenCalled();
  });

  it("enables the client progress section without blocking the page on business reads", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...actor,
      capabilities: new Set([
        permissionCodes.fundingApplicationAllRead,
        permissionCodes.workflowInstanceAllRead,
      ]),
    });

    const page = await ApplicationPage({
      params: Promise.resolve({ id: applicationId }),
    });

    expect(getWorkflowProgress).not.toHaveBeenCalled();
    expect(getAdminApplicationDetail).not.toHaveBeenCalled();
    expect(listContextualApplicationRfis).not.toHaveBeenCalled();
    expect(page.props.canReadWorkflow).toBe(true);
    expect(page.props.taskId).toBeUndefined();
  });
  it("selects Workflow Progress from the application deep link", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...actor,
      capabilities: new Set([
        permissionCodes.fundingApplicationAllRead,
        permissionCodes.workflowInstanceAllRead,
      ]),
    });
    const page = await ApplicationPage({
      params: Promise.resolve({ id: applicationId }),
      searchParams: Promise.resolve({ tab: "workflow-progress" }),
    });
    expect(page.props.initialTab).toBe("workflow-progress");
  });

  it("loads progress using a validated assigned task context", async () => {
    const taskId = "33333333-3333-4333-8333-333333333333";
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...actor,
      capabilities: new Set([
        permissionCodes.workflowTaskAssignedRead,
        permissionCodes.workflowInstanceAssignedRead,
      ]),
    });
    const page = await ApplicationPage({
      params: Promise.resolve({ id: applicationId }),
      searchParams: Promise.resolve({ tab: "workflow-progress", taskId }),
    });
    expect(getWorkflowProgress).not.toHaveBeenCalled();
    expect(page.props.canReadWorkflow).toBe(true);
    expect(page.props.taskId).toBe(taskId);
  });

  it.each([undefined, "invalid", ["33333333-3333-4333-8333-333333333333"]])(
    "does not read assigned progress with an invalid task context: %s",
    async (taskId) => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        ...actor,
        capabilities: new Set([
          permissionCodes.workflowTaskAssignedRead,
          permissionCodes.workflowInstanceAssignedRead,
        ]),
      });
      const page = await ApplicationPage({
        params: Promise.resolve({ id: applicationId }),
        searchParams: Promise.resolve({ tab: "workflow-progress", taskId }),
      });
      expect(getWorkflowProgress).not.toHaveBeenCalled();
      expect(page.props.canReadWorkflow).toBe(false);
    },
  );

  it("does not grant assigned workflow access from the query parameters", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...actor,
      capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
    });
    const page = await ApplicationPage({
      params: Promise.resolve({ id: applicationId }),
      searchParams: Promise.resolve({
        taskId: "33333333-3333-4333-8333-333333333333",
      }),
    });
    expect(getWorkflowProgress).not.toHaveBeenCalled();
    expect(page.props.initialTab).toBe("overview");
  });
});
