import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkflowTaskRuntimeContext } from "@/modules/workflows/infrastructure/WorkflowRuntimeContextRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const taskId = "20000000-0000-4000-8000-000000000002";
const assignedVersionId = "30000000-0000-4000-8000-000000000003";

describe("workflow task runtime context query", () => {
  it("loads the assigned version without comparing it to the definition version", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{
        contextFields: [],
        formVersionId: assignedVersionId,
        taskInstanceId: taskId,
      }],
    });
    vi.mocked(getDatabase).mockReturnValue({ execute } as never);

    const source = await readWorkflowTaskRuntimeContext(actorId, taskId);

    expect(source?.binding.formVersionId).toBe(assignedVersionId);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain('task.form_version_id AS "formVersionId"');
    expect(query.sql).toContain(
      "binding.task_definition_id = task.workflow_task_definition_id",
    );
    expect(query.sql).not.toContain("binding.form_version_id = task.form_version_id");
    expect(query.sql).toContain("task.form_version_id IS NOT NULL");
    expect(query.sql).toContain("app_workflow_task_coi_cleared(task.id,");
    expect(query.sql).toContain("task.assigned_user_id =");
    expect(query.params).toContain(actorId);
    expect(query.params).toContain(taskId);
  });
});
