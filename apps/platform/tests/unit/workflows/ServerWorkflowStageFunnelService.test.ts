import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowStageFunnelScope", () => ({
  readWorkflowStageFunnelScope: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowStageFunnelRepository",
  () => ({ readWorkflowStageFunnelCounts: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowStageApplicationsRepository",
  () => ({ readWorkflowStageApplications: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowStageFunnelExportWriter",
  () => ({ writeWorkflowStageFunnelExport: vi.fn() }),
);
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { readWorkflowStageFunnelScope } from "@/modules/workflows/infrastructure/WorkflowStageFunnelScope";
import { readWorkflowStageFunnelCounts } from "@/modules/workflows/infrastructure/WorkflowStageFunnelRepository";
import { readWorkflowStageApplications } from "@/modules/workflows/infrastructure/WorkflowStageApplicationsRepository";
import { writeWorkflowStageFunnelExport } from "@/modules/workflows/infrastructure/WorkflowStageFunnelExportWriter";
import {
  exportWorkflowStageApplications,
  getWorkflowStageFunnel,
  listWorkflowStageApplications,
} from "@/modules/workflows/application/runtime/ServerWorkflowStageFunnelService";

const actor: AuthenticatedUser = {
  id: "actor",
  email: "staff@example.test",
  displayName: "Staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: "staff",
  status: "active",
  userType: "staff",
  roleCodes: new Set(),
  capabilities: new Set([
    permissionCodes.fundingApplicationAllRead,
    permissionCodes.workflowInstanceAllRead,
    permissionCodes.workflowTaskAllRead,
    permissionCodes.fundingApplicationExport,
  ]),
};
const query = { stageKey: "FINANCIAL", page: 2, pageSize: 25 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readWorkflowStageFunnelScope).mockResolvedValue({
    fundingCallId: "call-only",
    fundingCallTitle: "Growth",
  });
  vi.mocked(readWorkflowStageFunnelCounts).mockResolvedValue([]);
  vi.mocked(readWorkflowStageApplications).mockResolvedValue({
    total: 0,
    items: [],
  });
});

describe("funding call stage funnel service", () => {
  it.each([
    null,
    {
      ...actor,
      capabilities: new Set([permissionCodes.workflowInstanceAssignedRead]),
    },
    {
      ...actor,
      capabilities: new Set([permissionCodes.fundingApplicationAllRead]),
    },
  ])(
    "rejects a caller without cross-application access before reading",
    async (user) => {
      await expect(
        getWorkflowStageFunnel(user, "application"),
      ).rejects.toBeInstanceOf(
        user ? PermissionDeniedError : AuthenticationRequiredError,
      );
      expect(readWorkflowStageFunnelScope).not.toHaveBeenCalled();
    },
  );

  it("derives the funding call from the application and passes no workflow-version filter", async () => {
    await expect(getWorkflowStageFunnel(actor, "application")).resolves.toEqual(
      { fundingCallTitle: "Growth", stages: [] },
    );
    expect(readWorkflowStageFunnelScope).toHaveBeenCalledWith("application");
    expect(readWorkflowStageFunnelCounts).toHaveBeenCalledWith("call-only");
  });

  it("requires task-content access before reading an application list", async () => {
    const user = {
      ...actor,
      capabilities: new Set([
        permissionCodes.fundingApplicationAllRead,
        permissionCodes.workflowInstanceAllRead,
      ]),
    };
    await expect(
      listWorkflowStageApplications(user, "application", query),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowStageApplications).not.toHaveBeenCalled();
  });

  it("passes the actor for peer visibility and retains pagination", async () => {
    await expect(
      listWorkflowStageApplications(actor, "application", query),
    ).resolves.toEqual({ total: 0, items: [], page: 2, pageSize: 25 });
    expect(readWorkflowStageApplications).toHaveBeenCalledWith(
      "call-only",
      "actor",
      query,
    );
  });

  it("requires the export grant independently of read grants", async () => {
    const user = {
      ...actor,
      capabilities: new Set(
        [...actor.capabilities].filter(
          (code) => code !== permissionCodes.fundingApplicationExport,
        ),
      ),
    };
    await expect(
      exportWorkflowStageApplications(
        user,
        "application",
        "FINANCIAL",
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(writeWorkflowStageFunnelExport).not.toHaveBeenCalled();
  });

  it("uses the same call and actor for exports", async () => {
    const signal = new AbortController().signal;
    await exportWorkflowStageApplications(
      actor,
      "application",
      "FINANCIAL",
      signal,
    );
    expect(writeWorkflowStageFunnelExport).toHaveBeenCalledWith(
      "call-only",
      "actor",
      "FINANCIAL",
      signal,
    );
  });

  it("rejects missing scope and invalid pagination", async () => {
    vi.mocked(readWorkflowStageFunnelScope).mockResolvedValue(null);
    await expect(
      getWorkflowStageFunnel(actor, "missing"),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    await expect(
      listWorkflowStageApplications(actor, "application", {
        ...query,
        pageSize: 500,
      }),
    ).rejects.toThrow();
    expect(readWorkflowStageApplications).not.toHaveBeenCalled();
  });
});
