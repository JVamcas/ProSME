import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/workflows/infrastructure/WorkflowProgressRepository", () => ({
  readWorkflowProgress: vi.fn(),
  readWorkflowTakenPaths: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));

import { getDatabase } from "@/db/client";
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { getWorkflowProgress } from "@/modules/workflows/application/runtime/ServerWorkflowProgressService";
import { readWorkflowProgress, readWorkflowTakenPaths } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";

const actor = {
  id: "reviewer-id",
  status: "active",
  capabilities: new Set([
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowInstanceAssignedRead,
  ]),
} as AuthenticatedUser;
const execute = vi.fn();
const context = {
  applicationId: "application-id",
  workflowInstanceId: "instance-id",
  viewPermission: permissionCodes.workflowTaskAssignedRead,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
  execute.mockResolvedValue({ rows: [context] });
  vi.mocked(readWorkflowProgress).mockResolvedValue({
    id: "instance-id",
    versionId: "version-id",
    stages: [],
  } as never);
  vi.mocked(readWorkflowTakenPaths).mockResolvedValue([]);
  vi.mocked(findWorkflowGraph).mockResolvedValue(null);
});

describe("assigned workflow progress", () => {
  it("allows the assigned reviewer and scopes the context lookup in SQL", async () => {
    const progress = await getWorkflowProgress(actor, "application-id", { taskId: "task-id" });

    expect(progress?.id).toBe("instance-id");
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0] as SQL);
    expect(query.sql).toContain('task.assigned_user_id =');
    expect(query.sql).toContain('app_workflow_task_coi_cleared');
    expect(query.sql).toContain("workflow.status = 'ACTIVE'");
    expect(query.sql).toContain("stage.status IN ('ACTIVE', 'BLOCKED')");
    expect(query.sql).not.toContain("SELECT *");
    expect(query.params).toEqual(["task-id", "reviewer-id", "reviewer-id"]);
  });

  it.each([
    ["unassigned, unavailable, or COI blocked task", []],
    ["task from another application", [{ ...context, applicationId: "other-application" }]],
  ])("denies %s before reading progress", async (_label, rows) => {
    execute.mockResolvedValue({ rows });

    await expect(getWorkflowProgress(actor, "application-id", { taskId: "task-id" }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowProgress).not.toHaveBeenCalled();
  });

  it("denies a different workflow instance before reading its graph", async () => {
    vi.mocked(readWorkflowProgress).mockResolvedValue({ id: "other-instance" } as never);

    await expect(getWorkflowProgress(actor, "application-id", { taskId: "task-id" }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findWorkflowGraph).not.toHaveBeenCalled();
  });

  it("requires the task's configured view permission", async () => {
    execute.mockResolvedValue({ rows: [{ ...context, viewPermission: "custom.task.read" }] });

    await expect(getWorkflowProgress(actor, "application-id", { taskId: "task-id" }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowProgress).not.toHaveBeenCalled();
  });

  it("does not let the assigned grant read arbitrary instances without a task", async () => {
    await expect(getWorkflowProgress(actor, "application-id"))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(execute).not.toHaveBeenCalled();
    expect(readWorkflowProgress).not.toHaveBeenCalled();
  });

  it("requires the assigned progress grant before checking task context", async () => {
    await expect(getWorkflowProgress({
      ...actor,
      capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
    }, "application-id", { taskId: "task-id" }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(execute).not.toHaveBeenCalled();
  });
});
