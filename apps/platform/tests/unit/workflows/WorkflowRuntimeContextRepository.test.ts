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
      rows: [
        {
          contextFields: [],
          formVersionId: assignedVersionId,
          taskInstanceId: taskId,
        },
      ],
    });
    vi.mocked(getDatabase).mockReturnValue({ execute } as never);

    const source = await readWorkflowTaskRuntimeContext(actorId, taskId);

    expect(source?.binding.formVersionId).toBe(assignedVersionId);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain('task.form_version_id AS "formVersionId"');
    expect(query.sql).toContain(
      "binding.task_definition_id = task.workflow_task_definition_id",
    );
    expect(query.sql).not.toContain(
      "binding.form_version_id = task.form_version_id",
    );
    expect(query.sql).toContain("task.form_version_id IS NOT NULL");
    expect(query.sql).toContain("LEFT JOIN app_stage_task_form_bindings binding");
    expect(query.sql).toContain("verification.version_id = application.eligibility_rule_set_version_id");
    expect(query.sql).toContain("verification.form_version_id = task.form_version_id");
    expect(query.sql).toContain("NOT inherited_form.enabled AND binding.task_definition_id IS NOT NULL");
    expect(query.sql).toContain("CASE WHEN inherited_form.enabled THEN '[]'::jsonb");
    expect(query.sql).toContain("app_workflow_task_coi_cleared(task.id,");
    expect(query.sql).toContain("task.assigned_user_id =");
    expect(query.sql).toContain("prior_task.result -> 'evaluatedFormValues'");
    expect(query.params).toContain(actorId);
    expect(query.params).toContain(taskId);
  });

  it("normalizes multiple completed tasks into one stage context", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          contextFields: [],
          formVersionId: assignedVersionId,
          priorStageValues: [
            {
              responseValues: null,
              stageKey: "ADMIN_ELIGIBILITY_SCREENING",
              taskResult: {
                items: [{ accepted: true, code: "DOCUMENTS_COMPLETE" }],
              },
            },
            {
              responseValues: { reviewerNote: "Eligible" },
              stageKey: "ADMIN_ELIGIBILITY_SCREENING",
              taskResult: {
                items: [{ accepted: true, code: "ELIGIBILITY_CONFIRMED" }],
                outcome: "ELIGIBLE",
              },
            },
          ],
          taskInstanceId: taskId,
        },
      ],
    });
    vi.mocked(getDatabase).mockReturnValue({ execute } as never);

    const source = await readWorkflowTaskRuntimeContext(actorId, taskId);

    expect(source?.priorStageValues).toEqual([
      {
        result: {},
        stageKey: "ADMIN_ELIGIBILITY_SCREENING",
        values: {
          DOCUMENTS_COMPLETE: true,
          ELIGIBILITY_CONFIRMED: true,
          checklist: {
            DOCUMENTS_COMPLETE: { accepted: true },
            ELIGIBILITY_CONFIRMED: { accepted: true },
          },
          form: { reviewerNote: "Eligible" },
          outcome: "ELIGIBLE",
          result: { outcome: "ELIGIBLE" },
          reviewerNote: "Eligible",
        },
      },
    ]);
  });
});
