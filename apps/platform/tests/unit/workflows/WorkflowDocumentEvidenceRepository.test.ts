import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/workflows/infrastructure/WorkflowRuntimeLock", () => ({
  lockWorkflowRuntimeForTask: vi.fn(),
  lockWorkflowRuntimeForStage: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { appendDocumentEvidenceVersion } from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceRepository";

const input = {
  applicationId: "application-id",
  taskId: "task-id",
  requirementId: "requirement-id",
  contentType: "application/pdf",
  objectKey: "evidence/file.pdf",
  originalName: "file.pdf",
  sizeBytes: 10,
  uploadedBy: "reviewer-id",
  validUntil: null,
};

describe("task document uploads", () => {
  it("binds the version atomically after validating task and requirement ownership", async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "version-id", versionNumber: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    expect(await appendDocumentEvidenceVersion({ execute } as never, input))
      .toEqual({ id: "version-id", versionNumber: 1 });
    const dialect = new PgDialect();
    const upload = dialect.sqlToQuery(execute.mock.calls[1][0]);
    expect(upload.sql).toContain("task.workflow_task_definition_id = requirement.task_definition_id");
    expect(upload.sql).toContain("task_stage.workflow_instance_id = workflow.id");
    const binding = dialect.sqlToQuery(execute.mock.calls[2][0]);
    expect(binding.sql).toContain("INSERT INTO app_workflow_task_document_evidence");
    expect(binding.params).toEqual([input.taskId, "version-id"]);
  });

  it("does not create a binding when the task does not own the requirement", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    expect(await appendDocumentEvidenceVersion({ execute } as never, input)).toBeNull();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
