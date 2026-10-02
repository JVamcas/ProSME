import pg from "pg";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import * as databaseSchema from "@/db/schema";
import { loadDueWorkflowDeadlines, workflowProcessorHasPermission } from "@/modules/workflows/infrastructure/WorkflowDeadlineRepository";
import { processConfiguredWorkflowDeadlineBatch } from "@/modules/workflows/application/runtime/ServerWorkflowDeadlineService";
import { workflowTaskEffectiveDeadline } from "@/modules/workflows/infrastructure/WorkflowSlaDeadline";
import { seedNotificationConfiguration } from "@/modules/notifications/infrastructure/NotificationConfigurationSeedRepository";
import { readWorkQueue } from "@/modules/workflows/infrastructure/WorkQueueRepository";
import { formContextIds as id } from "../support/WorkflowEligibilityFormContextFixture";
import { deadlineFixtureIds as extra, installWorkflowDeadlineFixture, insertDeadlineRfi } from "../support/WorkflowDeadlineFixture";

const enabled = process.env.RUN_WORKFLOW_DEADLINE_DATABASE_TESTS === "true";
const secret = "workflow-deadline-database-test-service-secret";
let pool: pg.Pool;
let client: pg.PoolClient;
let endFixture: () => void;
let fixtureTransaction: Promise<unknown>;

beforeAll(async () => {
  if (!enabled) return;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  client = await pool.connect();
  const ready = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  endFixture = finish.resolve;
  fixtureTransaction = drizzle(client, { schema: databaseSchema }).transaction(async (transaction) => {
    vi.mocked(getDatabase).mockReturnValue(transaction as never);
    await client.query(readFileSync("drizzle/0149_workflow_deadline_processor.sql", "utf8"));
    await seedNotificationConfiguration();
    await installWorkflowDeadlineFixture(client);
    ready.resolve();
    await finish.promise;
    throw new Error("ROLLBACK_DEADLINE_FIXTURE");
  }).catch((error: Error) => {
    if (error.message !== "ROLLBACK_DEADLINE_FIXTURE") ready.reject(error);
  });
  await ready.promise;
  process.env.WORKFLOW_PROCESSOR_SECRET = secret;
}, 30_000);

beforeEach(async () => {
  if (enabled) await client.query("SAVEPOINT deadline_case");
});
afterEach(async () => {
  if (enabled) await client.query("ROLLBACK TO SAVEPOINT deadline_case");
});
afterAll(async () => {
  endFixture?.();
  await fixtureTransaction;
  client?.release();
  await pool?.end();
});

function runBatch() {
  return processConfiguredWorkflowDeadlineBatch(`Bearer ${secret}`, crypto.randomUUID());
}

async function counts() {
  const result = await client.query(
    `SELECT
      (SELECT count(*)::integer FROM app_workflow_deadline_executions WHERE workflow_instance_id = $1::uuid AND processed_at IS NOT NULL) AS executions,
      (SELECT count(*)::integer FROM app_notification_outbox WHERE context ->> 'workflowInstanceId' = $1::uuid::text) AS notifications`,
    [id.workflow],
  );
  return result.rows[0];
}

(enabled ? describe : describe.skip)("workflow deadlines against PostgreSQL", () => {
  it("denies user tokens before touching runtime work", async () => {
    await expect(processConfiguredWorkflowDeadlineBatch("Bearer user-token", crypto.randomUUID()))
      .rejects.toMatchObject({ name: "AuthenticationRequiredError" });
  });

  it("requires the canonical PostgreSQL grant on the disabled System principal", async () => {
    expect(await workflowProcessorHasPermission()).toBe(true);
    await client.query(
      `DELETE FROM app_role_capabilities WHERE capability_id IN
        (SELECT id FROM app_capabilities WHERE code = 'workflow.deadline.all.process')`,
    );
    await expect(runBatch()).rejects.toMatchObject({ name: "PermissionDeniedError" });
    expect(await counts()).toEqual({ executions: 0, notifications: 0 });
  });

  it("escalates an overdue task, transfers responsibility, audits and never duplicates", async () => {
    await client.query("UPDATE app_workflow_tasks SET due_at = now() - interval '1 hour' WHERE id = $1", [id.unboundTask]);
    expect(await runBatch()).toMatchObject({ processed: 1, failed: 0 });
    const task = await client.query("SELECT assigned_user_id FROM app_workflow_tasks WHERE id = $1", [id.unboundTask]);
    expect(task.rows[0].assigned_user_id).toBe(id.otherActor);
    const execution = await client.query("SELECT actor_type, actor_id FROM app_workflow_action_executions WHERE task_id = $1 AND actor_type = 'SYSTEM'", [id.unboundTask]);
    expect(execution.rows).toEqual([{ actor_type: "SYSTEM", actor_id: null }]);
    await runBatch();
    expect(await counts()).toEqual({ executions: 1, notifications: 1 });
  });

  it("skips a workflow claimed by another processor and safely picks it up later", async () => {
    await insertDeadlineRfi(client, "CLOSE_REQUEST", false);
    const competitor = await pool.connect();
    try {
      await competitor.query("BEGIN");
      const locked = await competitor.query(
        "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked", [id.workflow],
      );
      expect(locked.rows[0].locked).toBe(true);
      expect(await runBatch()).toMatchObject({ skipped: 2, processed: 0 });
      expect(await counts()).toEqual({ executions: 0, notifications: 0 });
    } finally {
      await competitor.query("ROLLBACK");
      competitor.release();
    }
    expect(await runBatch()).toMatchObject({ processed: 2 });
  });

  it("emits configured reminder offsets once and skips stale reminders after expiry", async () => {
    const rfiId = await insertDeadlineRfi(client, "CLOSE_REQUEST", false);
    expect(await runBatch()).toMatchObject({ processed: 2 });
    await runBatch();
    expect(await counts()).toEqual({ executions: 2, notifications: 2 });
    await client.query("UPDATE app_workflow_rfis SET deadline_at = now() - interval '1 hour' WHERE id = $1", [rfiId]);
    const due = await loadDueWorkflowDeadlines(new Date(), 100);
    expect(due.map((item) => item.kind)).toEqual(["RFI_EXPIRED"]);
  });

  it.each(["CLOSE_REQUEST", "ESCALATE", "RETURN"] as const)("atomically applies RFI expiry %s", async (expiry) => {
    const rfiId = await insertDeadlineRfi(client, expiry);
    expect(await runBatch()).toMatchObject({ processed: 1, failed: 0 });
    const rfi = await client.query("SELECT status, continuation_applied_at FROM app_workflow_rfis WHERE id = $1", [rfiId]);
    expect(rfi.rows[0].status).toBe("EXPIRED");
    expect(rfi.rows[0].continuation_applied_at).not.toBeNull();
    const lifecycle = await client.query("SELECT actor_type, actor_id FROM app_workflow_rfi_lifecycle_events WHERE rfi_id = $1", [rfiId]);
    expect(lifecycle.rows).toEqual([{ actor_type: "SYSTEM", actor_id: null }]);
    if (expiry === "RETURN") {
      const source = await client.query("SELECT status FROM app_workflow_tasks WHERE id = $1", [id.unboundTask]);
      expect(source.rows[0].status).toBe("CANCELLED");
      const rework = await client.query("SELECT id FROM app_workflow_stage_instances WHERE workflow_stage_definition_id = $1", [extra.reworkStage]);
      expect(rework.rows).toHaveLength(1);
    }
    if (expiry === "ESCALATE") {
      const escalation = await client.query("SELECT trigger FROM app_workflow_escalations WHERE task_id = $1", [id.unboundTask]);
      expect(escalation.rows[0].trigger).toBe("RFI_EXPIRY");
    }
    await runBatch();
    expect((await counts()).executions).toBe(1);
  });

  it("rolls back expiry when its configured action cannot execute and backs off retries", async () => {
    const rfiId = await insertDeadlineRfi(client, "ESCALATE");
    await client.query("UPDATE app_users SET status = 'disabled' WHERE id = $1", [id.otherActor]);
    expect(await runBatch()).toMatchObject({ failed: 1, processed: 0 });
    const rfi = await client.query("SELECT status FROM app_workflow_rfis WHERE id = $1", [rfiId]);
    expect(rfi.rows[0].status).toBe("OPEN");
    expect(await counts()).toEqual({ executions: 0, notifications: 0 });
    expect(await loadDueWorkflowDeadlines(new Date(), 100)).toHaveLength(0);
  });

  it("resumes a due date deferral once", async () => {
    await client.query("UPDATE app_workflow_stage_instances SET status = 'BLOCKED' WHERE id = $1", [id.stageInstance]);
    await client.query(
      `INSERT INTO app_workflow_deferrals
        (action_execution_id, workflow_instance_id, stage_instance_id, task_id, mode,
         continuation, comment, resume_at, previous_stage_status, deferred_by, deferred_at)
       VALUES ($1, $2, $3, $4, 'DATE', 'RESUME_ON_DATE', 'Later', now() - interval '1 hour',
         'ACTIVE', $5, now() - interval '1 day')`,
      [extra.actionExecution, id.workflow, id.stageInstance, id.unboundTask, id.actor],
    );
    expect(await runBatch()).toMatchObject({ processed: 1 });
    const stage = await client.query("SELECT status FROM app_workflow_stage_instances WHERE id = $1", [id.stageInstance]);
    expect(stage.rows[0].status).toBe("ACTIVE");
    await runBatch();
    expect(await counts()).toEqual({ executions: 1, notifications: 1 });
  });

  it("sends a hold review reminder without automatically releasing the hold", async () => {
    await client.query("UPDATE app_workflow_stage_instances SET status = 'BLOCKED' WHERE id = $1", [id.stageInstance]);
    await client.query(
      `INSERT INTO app_workflow_holds
        (action_execution_id, workflow_instance_id, stage_instance_id, task_id,
         previous_stage_status, comment, review_at, held_by)
       VALUES ($1, $2, $3, $4, 'ACTIVE', 'Await evidence', now() - interval '1 hour', $5)`,
      [extra.actionExecution, id.workflow, id.stageInstance, id.unboundTask, id.actor],
    );
    expect(await runBatch()).toMatchObject({ processed: 1 });
    const stage = await client.query("SELECT status FROM app_workflow_stage_instances WHERE id = $1", [id.stageInstance]);
    expect(stage.rows[0].status).toBe("BLOCKED");
    await runBatch();
    expect(await counts()).toEqual({ executions: 1, notifications: 1 });
  });

  it("merges overlapping pause periods and uses the same effective deadline in the queue", async () => {
    await client.query(
      "UPDATE app_workflow_tasks SET created_at = now() - interval '10 hours', due_at = now() - interval '1 hour' WHERE id = $1",
      [id.unboundTask],
    );
    await client.query(
      `INSERT INTO app_workflow_holds
        (action_execution_id, workflow_instance_id, stage_instance_id, task_id,
         previous_stage_status, comment, held_by, held_at, resumed_at, resumed_by, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE', 'Pause', $5, now() - interval '5 hours',
         now() - interval '2 hours', $5, 'RESUMED')`,
      [extra.actionExecution, id.workflow, id.stageInstance, id.unboundTask, id.actor],
    );
    const rfiId = await insertDeadlineRfi(client);
    await client.query(
      `UPDATE app_workflow_rfis SET status = 'CLOSED', created_at = now() - interval '4 hours',
        continuation_applied_at = now() - interval '1 hour' WHERE id = $1`, [rfiId],
    );
    const result = await getDatabase().execute<{ pausedHours: number }>(sql`
      SELECT extract(epoch FROM (${workflowTaskEffectiveDeadline(sql`task`)} - task.due_at)) / 3600 AS "pausedHours"
      FROM app_workflow_tasks task WHERE task.id = ${id.unboundTask}::uuid
    `);
    expect(Number(result.rows[0].pausedHours)).toBe(4);
    expect(await loadDueWorkflowDeadlines(new Date(), 100)).toHaveLength(0);
    expect((await readWorkQueue(id.actor, { scope: "overdue", limit: 10 })).items).toHaveLength(0);
  });

  it("excludes terminal workflows and respects the SQL batch boundary", async () => {
    await insertDeadlineRfi(client, "CLOSE_REQUEST", false);
    expect(await loadDueWorkflowDeadlines(new Date(), 1)).toHaveLength(1);
    await client.query("UPDATE app_workflow_instances SET status = 'CANCELLED' WHERE id = $1", [id.workflow]);
    expect(await loadDueWorkflowDeadlines(new Date(), 100)).toHaveLength(0);
  });

  it("projects, orders and scopes effective deadlines in the work queue", async () => {
    await client.query(
      `UPDATE app_workflow_tasks SET due_at = now() + interval '1 hour' WHERE id = $1`, [id.unboundTask],
    );
    await client.query(
      `UPDATE app_workflow_tasks SET due_at = now() + interval '2 hours' WHERE id = $1`, [id.boundTask],
    );
    const queue = await readWorkQueue(id.actor, { scope: "due-soon", limit: 1 });
    expect(queue.total).toBe(2);
    expect(queue.items.map((item) => item.taskInstanceId)).toEqual([id.unboundTask, id.boundTask]);
    const next = await readWorkQueue(id.actor, { scope: "due-soon", limit: 1 }, {
      id: id.unboundTask, dueAt: new Date(queue.items[0]!.dueAt!),
    });
    expect(next.items[0]!.taskInstanceId).toBe(id.boundTask);
    expect((await readWorkQueue(id.otherActor, { scope: "due-soon", limit: 10 })).items).toHaveLength(0);
  });

  it("preserves edited notification recipients when migration and seed setup rerun", async () => {
    await client.query("DELETE FROM app_notification_event_rule_channels WHERE id = '00000000-0000-4000-8000-000000000621'");
    await client.query(readFileSync("drizzle/0149_workflow_deadline_processor.sql", "utf8"));
    await seedNotificationConfiguration();
    const result = await client.query("SELECT id FROM app_notification_event_rule_channels WHERE id = '00000000-0000-4000-8000-000000000621'");
    expect(result.rows).toHaveLength(0);
  });
});
