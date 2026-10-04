import type { AuthenticatedUser } from "@/auth/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({ readWorkflowTask: vi.fn() }));
vi.mock("@/modules/workflows/infrastructure/WorkflowDocumentEvidenceRepository", () => ({
  findDocumentEvidenceVersion: vi.fn(), createDocumentEvidenceVersion: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { findDocumentEvidenceVersion } from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceRepository";
import {
  createWorkflowTaskDocumentDownload,
  uploadWorkflowTaskDocument,
} from "@/modules/work-queue/application/ServerWorkflowTaskDocumentService";
import {
  workflowTaskActorFixture,
  workflowTaskServiceFixture as task,
} from "../../support/WorkflowTaskServiceFixture";

const admin: AuthenticatedUser = {
  ...workflowTaskActorFixture,
  id: "20000000-0000-4000-8000-000000000002", status: "active",
  capabilities: new Set([permissionCodes.workflowTaskAllRead, permissionCodes.workflowTaskAssignedProcess]),
};
const storage = { read: vi.fn(), put: vi.fn(), delete: vi.fn() };
const versionId = "evidence-version";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readWorkflowTask).mockImplementation(async (_actor, _task, allowAll) => allowAll ? {
    ...task,
    assignedToActor: false,
    documentRequirements: [{
      id: "requirement", stableKey: "REPORT", name: "Report",
      document: { versionId },
    }],
  } as never : null);
  vi.mocked(findDocumentEvidenceVersion).mockResolvedValue({
    requirementId: "requirement", objectKey: "stored/report", contentType: "application/pdf",
    originalName: "report.pdf",
  } as never);
  storage.read.mockResolvedValue(Buffer.from("report"));
});

describe("oversight task document access", () => {
  it("downloads evidence bound to the viewed task", async () => {
    expect(await createWorkflowTaskDocumentDownload(admin, task.taskInstanceId, versionId, storage))
      .toMatchObject({ fileName: "report.pdf", contentType: "application/pdf" });
    expect(findDocumentEvidenceVersion).toHaveBeenCalledWith(task.applicationId, versionId);
    expect(storage.read).toHaveBeenCalledWith("stored/report");
  });

  it("rejects document versions outside the task's evidence", async () => {
    await expect(createWorkflowTaskDocumentDownload(admin, task.taskInstanceId, "another-version", storage))
      .rejects.toThrow("workflow document not found");
    expect(findDocumentEvidenceVersion).not.toHaveBeenCalled();
    expect(storage.read).not.toHaveBeenCalled();
  });

  it("cannot upload to another person's task", async () => {
    await expect(uploadWorkflowTaskDocument(
      admin, task.taskInstanceId, "requirement", new File(["test"], "report.pdf"), storage,
    )).rejects.toThrow("workflow task not found");
    expect(vi.mocked(readWorkflowTask).mock.calls[0]).toEqual([admin.id, task.taskInstanceId]);
    expect(storage.put).not.toHaveBeenCalled();
  });
});
