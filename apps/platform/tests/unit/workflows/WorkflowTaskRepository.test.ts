import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";

const execute = vi.fn();
const actorId = "20000000-0000-4000-8000-000000000002";
const taskId = "10000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("workflow task detail projection", () => {
  it("includes the assigned form name while retaining task assignment scope", async () => {
    execute.mockResolvedValue({
      rows: [{ formName: "Eligibility screening form", taskInstanceId: taskId }],
    });

    const task = await readWorkflowTask(actorId, taskId);

    expect(task?.formName).toBe("Eligibility screening form");
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain('form_definition.name AS "formName"');
    expect(query.sql).toContain("LEFT JOIN app_form_versions form_version");
    expect(query.sql).toContain("LEFT JOIN app_form_definitions form_definition");
    expect(query.sql).toContain("definition.config ->> 'formPurpose' = 'ELIGIBILITY_VERIFICATION'");
    expect(query.sql).toContain("response.values = (task.result -> 'evaluatedFormValues')");
    expect(query.sql).toContain("task.assigned_user_id =");
    expect(query.sql).toContain("task_evidence.task_id = task.id");
    expect(query.sql).toContain("task_evidence.document_version_id = evidence.id");
    expect(query.params).toContain(actorId);
    expect(query.params).toContain(taskId);
  });
});
