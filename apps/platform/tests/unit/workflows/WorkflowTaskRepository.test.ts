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
      rows: [
        { formName: "Eligibility screening form", taskInstanceId: taskId },
      ],
    });

    const task = await readWorkflowTask(actorId, taskId);

    expect(task?.formName).toBe("Eligibility screening form");
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain('form_definition.name AS "formName"');
    expect(query.sql).toContain("LEFT JOIN app_form_versions form_version");
    expect(query.sql).toContain(
      "LEFT JOIN app_form_definitions form_definition",
    );
    expect(query.sql).toContain(
      "definition.config ->> 'formPurpose' = 'ELIGIBILITY_VERIFICATION'",
    );
    expect(query.sql).toContain(
      "response.values = (task.result -> 'evaluatedFormValues')",
    );
    expect(query.sql).toContain("task.assigned_user_id =");
    expect(query.sql).toContain("document_target.id = task.id");
    expect(query.sql).toContain(
      "task_evidence.document_version_id = evidence.id",
    );
    expect(query.params).toContain(actorId);
    expect(query.sql).toContain(
      "document_owner.stage_instance_id = document_target.stage_instance_id",
    );
    expect(query.sql).toContain(
      "document_owner.workflow_task_definition_id = document_target.workflow_task_definition_id",
    );
    expect(query.sql).toContain(
      "newer_version.version_number > candidate.version_number",
    );
    expect(query.params).toContain(taskId);
  });
});

describe("workflow task oversight projection", () => {
  it.each([false, true])(
    "uses explicit all-task scope (%s) without widening default reads",
    async (allowAll) => {
      execute.mockResolvedValue({ rows: [] });
      await readWorkflowTask(actorId, taskId, allowAll);
      const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
      expect(query.params).toContain(allowAll);
      expect(query.sql).toContain('AS "assignedToActor"');
      expect(query.sql).toContain('AS "assignedUserName"');
      expect(query.sql).toContain('AS "coiCleared"');
      expect(query.sql).toMatch(/AND \(\$\d+ OR \(/);
      expect(query.sql).toContain("task.assigned_user_id =");
      expect(query.sql).toContain("document_target.id = task.id");
      expect(query.sql).toContain(
        "document_owner.stage_instance_id = document_target.stage_instance_id",
      );
      expect(query.sql).toContain(
        "document_owner.workflow_task_definition_id = document_target.workflow_task_definition_id",
      );
      expect(query.sql).toContain(
        "newer_version.version_number > candidate.version_number",
      );
      expect(query.params).toContain(taskId);
    },
  );
});

it("applies configured view permissions before loading task evidence", async () => {
  execute.mockResolvedValue({ rows: [] });
  await readWorkflowTask(actorId, taskId, false, [
    "workflow.task.assigned.read",
  ]);
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.sql).toContain("definition.permissions ->> 'view' IN (");
  expect(query.params).toContain("workflow.task.assigned.read");
});

it("enforces peer review release for administrative reads", async () => {
  execute.mockResolvedValue({ rows: [] });
  await readWorkflowTask(actorId, taskId, true);
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.sql).toContain("definition.reviewer_count > 1");
  expect(query.sql).toContain("definition.review_release <> 'IMMEDIATE'");
  expect(query.sql).toContain(
    "own_review.workflow_task_definition_id = definition.id",
  );
  expect(query.sql).toContain("release_threshold.first_satisfied = true");
  expect(query.sql).toContain(
    "released_rework.source_stage_instance_id = stage.id",
  );
});
