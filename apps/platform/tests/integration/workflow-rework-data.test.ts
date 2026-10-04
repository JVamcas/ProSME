import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { sql } from "drizzle-orm";
import { workflowDocumentEvidenceIsCurrent } from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceReadiness";
import {
  actorId,
  currentStage,
  definitionId,
  dialect,
  enabled,
  formId,
  initialize,
  newReviewer,
  newTask,
  originalStage,
  previousResponse,
  previousStage,
  previousTask,
  query,
} from "../support/WorkflowReworkDatabaseFixture";

(enabled ? describe : describe.skip)("rework data retention SQL", () => {
  it.each(["CLEAR", "RETAIN"] as const)(
    "%s scopes document evidence to the current task and preserves history",
    async (dataHandling) => {
      const versionId = randomUUID();
      await query(
        `INSERT INTO app_workflow_document_evidence_versions VALUES ($1, $2, 1)`,
        [versionId, randomUUID()],
      );
      await query(
        `INSERT INTO app_workflow_task_document_evidence VALUES ($1, $2)`,
        [previousTask, versionId],
      );
      await initialize(dataHandling);
      const evidence = await query(
        `SELECT task_id FROM app_workflow_task_document_evidence
        WHERE document_version_id = $1 ORDER BY task_id`,
        [versionId],
      );
      expect(evidence.rows.map((row) => row.task_id).sort()).toEqual(
        (dataHandling === "RETAIN"
          ? [previousTask, newTask]
          : [previousTask]
        ).sort(),
      );
      const statement = dialect.sqlToQuery(sql`
        SELECT ${workflowDocumentEvidenceIsCurrent(sql`${newTask}::uuid`)} AS current
        FROM (SELECT ${versionId}::uuid AS id) evidence
      `);
      const scoped = await query(statement.sql, statement.params);
      expect(scoped.rows[0].current).toBe(dataHandling === "RETAIN");
    },
  );

  it("copies the latest target iteration into a fresh draft for the new reviewer", async () => {
    await initialize("RETAIN");
    const responses = await query(
      `SELECT * FROM app_form_responses
      WHERE workflow_task_id = $1`,
      [newTask],
    );
    expect(responses.rows).toHaveLength(1);
    expect(responses.rows[0]).toMatchObject({
      respondent_user_id: newReviewer,
      status: "DRAFT",
      values: { amount: 125, explanation: "Prior assessment" },
      row_version: 1,
      completed_at: null,
      definition_snapshot: null,
      created_by: actorId,
    });
    const tasks = await query(
      `SELECT * FROM app_workflow_tasks WHERE id = $1`,
      [newTask],
    );
    expect(tasks.rows[0]).toMatchObject({
      supersedes_task_id: previousTask,
      status: "PENDING",
      result: { comments: [{ key: "note", value: "Fix amount" }] },
    });
    const audit = await query("SELECT after FROM app_workflow_audit_entries");
    expect(audit.rows[0].after).toMatchObject({
      dataHandling: "RETAIN",
      sourceTaskId: previousTask,
      sourceResponseId: previousResponse,
      responseId: responses.rows[0].id,
    });
    const history = await query(
      `SELECT status, values FROM app_form_responses WHERE id = $1`,
      [previousResponse],
    );
    expect(history.rows[0]).toEqual({
      status: "COMPLETED",
      values: { amount: 125, explanation: "Prior assessment" },
    });
  });

  it("clears only new working data and keeps original evidence", async () => {
    await initialize("CLEAR");
    const responses = await query(
      "SELECT workflow_task_id, status FROM app_form_responses",
    );
    expect(responses.rows).toEqual([
      { workflow_task_id: previousTask, status: "COMPLETED" },
    ]);
    const tasks = await query(
      "SELECT result, supersedes_task_id FROM app_workflow_tasks WHERE id = $1",
      [newTask],
    );
    expect(tasks.rows[0]).toEqual({
      result: null,
      supersedes_task_id: previousTask,
    });
    const audit = await query("SELECT after FROM app_workflow_audit_entries");
    expect(audit.rows[0].after).toMatchObject({
      dataHandling: "CLEAR",
      responseId: null,
    });
  });

  it("does not copy incompatible forms or another reviewer's slot", async () => {
    await query(
      "UPDATE app_workflow_tasks SET form_version_id = $1 WHERE id = $2",
      [randomUUID(), newTask],
    );
    await initialize("RETAIN");
    expect(
      (
        await query(
          "SELECT id FROM app_form_responses WHERE workflow_task_id = $1",
          [newTask],
        )
      ).rows,
    ).toEqual([]);
    await query("TRUNCATE app_workflow_audit_entries");
    await query(
      "UPDATE app_workflow_tasks SET reviewer_slot = 2, supersedes_task_id = NULL, result = NULL WHERE id = $1",
      [newTask],
    );
    await initialize("RETAIN");
    expect(
      (await query("SELECT after FROM app_workflow_audit_entries")).rows,
    ).toEqual([]);
  });

  it("does not fall back to an older iteration when the latest has no response", async () => {
    await query(
      "UPDATE app_workflow_tasks SET stage_instance_id = $1 WHERE id = $2",
      [originalStage, previousTask],
    );
    await initialize("RETAIN");
    expect(
      (
        await query(
          "SELECT id FROM app_form_responses WHERE workflow_task_id = $1",
          [newTask],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (await query("SELECT after FROM app_workflow_audit_entries")).rows,
    ).toEqual([]);
  });

  it("keeps multiple reviewer responses separate by task and slot", async () => {
    const secondSource = randomUUID();
    const secondTarget = randomUUID();
    const reviewer = randomUUID();
    await query(
      `INSERT INTO app_workflow_tasks
      (id, stage_instance_id, workflow_task_definition_id, reviewer_slot,
       assigned_user_id, form_version_id) VALUES
      ($1, $3, $5, 2, $6, $7), ($2, $4, $5, 2, $6, $7)`,
      [
        secondSource,
        secondTarget,
        previousStage,
        currentStage,
        definitionId,
        reviewer,
        formId,
      ],
    );
    await query(
      `INSERT INTO app_form_responses
      (workflow_task_id, form_version_id, respondent_user_id, status,
       values, created_by, updated_by)
      VALUES ($1, $2, $3, 'DRAFT', $4, $3, $3)`,
      [secondSource, formId, reviewer, { amount: 250 }],
    );
    await initialize("RETAIN");
    const responses = await query(
      `SELECT workflow_task_id, values
      FROM app_form_responses WHERE workflow_task_id IN ($1, $2)`,
      [newTask, secondTarget],
    );
    expect(responses.rows).toEqual(
      expect.arrayContaining([
        {
          workflow_task_id: newTask,
          values: { amount: 125, explanation: "Prior assessment" },
        },
        { workflow_task_id: secondTarget, values: { amount: 250 } },
      ]),
    );
    expect(responses.rows).toHaveLength(2);
  });

  it("retains captured drafts even when the previous task was cancelled", async () => {
    await query(
      "UPDATE app_workflow_tasks SET status = 'CANCELLED' WHERE id = $1",
      [previousTask],
    );
    await query(
      `UPDATE app_form_responses
      SET status = 'DRAFT', completed_at = NULL, definition_snapshot = NULL
      WHERE id = $1`,
      [previousResponse],
    );
    await initialize("RETAIN");
    const response = await query(
      `SELECT status, values FROM app_form_responses
      WHERE workflow_task_id = $1`,
      [newTask],
    );
    expect(response.rows).toEqual([
      {
        status: "DRAFT",
        values: { amount: 125, explanation: "Prior assessment" },
      },
    ]);
  });
});
