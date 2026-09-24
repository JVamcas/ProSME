import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("not found"); }),
  redirect: vi.fn(() => { throw new Error("redirected"); }),
}));
vi.mock("@/auth/authorization/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/modules/applications/ServerAdminApplicationDetailService", () => ({
  getAdminApplicationDetail: vi.fn(),
}));
vi.mock("@/modules/workflows/application/runtime/ServerWorkflowProgressService", () => ({
  getWorkflowProgress: vi.fn(),
}));
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
});

describe("staff application workflow progress tab", () => {
  it("omits the tab and does not read progress for an ordinary application reader", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...actor,
      capabilities: new Set([permissionCodes.fundingApplicationAllRead]),
    });

    const page = await ApplicationPage({ params: Promise.resolve({ id: applicationId }) });

    expect(page.props.workflowProgress).toBeUndefined();
    expect(getWorkflowProgress).not.toHaveBeenCalled();
  });

  it("passes progress to the tab for a workflow instance reader", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...actor,
      capabilities: new Set([
        permissionCodes.fundingApplicationAllRead,
        permissionCodes.workflowInstanceAllRead,
      ]),
    });

    const page = await ApplicationPage({ params: Promise.resolve({ id: applicationId }) });

    expect(getWorkflowProgress).toHaveBeenCalledWith(
      expect.anything(),
      applicationId,
    );
    expect(page.props.workflowProgress).toBeDefined();
  });
});
