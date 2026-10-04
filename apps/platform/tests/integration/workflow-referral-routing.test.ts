import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import { completeWorkflowReferralForStage } from "@/modules/workflows/infrastructure/WorkflowControlRepository";
import { workflowTaskControlAllowsCompletion } from "@/modules/workflows/infrastructure/WorkflowTaskControlReadiness";
import { loadWorkflowReferralReturn } from "@/modules/workflows/infrastructure/WorkflowReferralRoutingRepository";

const enabled = process.env.RUN_WORKFLOW_REFERRAL_DATABASE_TESTS === "true";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3_000,
});
const database = drizzle(client);
const workflow = randomUUID();
const source = randomUUID();
const referred = randomUUID();
const definition = randomUUID();
const task = randomUUID();
const referral = randomUUID();
const actor = randomUUID();
const input = {
  actorId: actor,
  correlationId: randomUUID(),
  referredStageInstanceId: referred,
};

beforeAll(async () => {
  if (!enabled) return;
  await client.connect();
  // Session-local tables prevent these repository tests from changing real data.
  await client.query(`
    CREATE TEMP TABLE app_workflow_instances (
      id uuid PRIMARY KEY, status text, current_stage_instance_id uuid
    );
    CREATE TEMP TABLE app_workflow_stage_instances (
      id uuid PRIMARY KEY, workflow_instance_id uuid,
      workflow_stage_definition_id uuid, status text
    );
    CREATE TEMP TABLE app_workflow_stage_definitions (id uuid PRIMARY KEY, name text);
    CREATE TEMP TABLE app_workflow_tasks (
      id uuid PRIMARY KEY, stage_instance_id uuid, status text,
      assigned_user_id uuid, result jsonb
    );
    CREATE TEMP TABLE app_workflow_referrals (
      id uuid PRIMARY KEY, workflow_instance_id uuid,
      source_stage_instance_id uuid, source_task_id uuid,
      referred_stage_instance_id uuid, return_to_referrer text,
      source_task_behavior text, status text, resolved_at timestamptz, resolved_by uuid
    );
    CREATE TEMP TABLE app_workflow_holds (stage_instance_id uuid, status text);
    CREATE TEMP TABLE app_workflow_deferrals (stage_instance_id uuid, status text);
    CREATE TEMP TABLE app_workflow_escalations (task_id uuid, status text, block_until_resolved boolean);
    CREATE TEMP TABLE app_workflow_events (
      id uuid DEFAULT gen_random_uuid(), workflow_instance_id uuid,
      event_code text, actor_id uuid, correlation_id uuid,
      payload jsonb, created_at timestamptz DEFAULT now()
    );
    CREATE TEMP TABLE app_workflow_audit_entries (
      id uuid DEFAULT gen_random_uuid(), runtime_sequence bigint GENERATED ALWAYS AS IDENTITY,
      actor_id uuid, action text, target_type text, target_id text,
      correlation_id uuid, idempotency_key text, workflow_instance_id uuid,
      stage_instance_id uuid, task_id uuid, reason text,
      before jsonb, after jsonb, created_at timestamptz DEFAULT now()
    );
  `);
});

beforeEach(async () => {
  if (!enabled) return;
  await client.query(`TRUNCATE app_workflow_instances, app_workflow_stage_instances,
    app_workflow_stage_definitions, app_workflow_tasks, app_workflow_referrals,
    app_workflow_events, app_workflow_audit_entries`);
  await client.query(
    "INSERT INTO app_workflow_instances VALUES ($1, 'ACTIVE', $2)",
    [workflow, referred],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_definitions VALUES ($1, 'Assessment')",
    [definition],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_instances VALUES ($1, $2, $3, 'ACTIVE')",
    [source, workflow, definition],
  );
  await client.query(
    "INSERT INTO app_workflow_tasks VALUES ($1, $2, 'IN_PROGRESS', $3, $4)",
    [task, source, actor, { amount: 100 }],
  );
  await client.query(
    `INSERT INTO app_workflow_referrals
    (id, workflow_instance_id, source_stage_instance_id, source_task_id,
     referred_stage_instance_id, return_to_referrer, source_task_behavior, status)
    VALUES ($1, $2, $3, $4, $5, 'YES', 'BLOCKED', 'ACTIVE')`,
    [referral, workflow, source, task, referred],
  );
});

afterAll(async () => {
  if (enabled) await client.end();
});

async function complete() {
  return database.transaction((transaction) =>
    completeWorkflowReferralForStage(transaction as never, input),
  );
}

(enabled ? describe : describe.skip)("referral completion routing", () => {
  it.each(["BLOCKED", "OPEN"])(
    "hands back the existing task with %s source behavior",
    async (behavior) => {
      await client.query(
        "UPDATE app_workflow_referrals SET source_task_behavior = $1",
        [behavior],
      );
      const result = await complete();
      expect(result?.returnTarget).toMatchObject({
        sourceTaskId: task,
        targetStageInstanceId: source,
        targetStageName: "Assessment",
      });
      expect(
        (
          await client.query(
            "SELECT current_stage_instance_id FROM app_workflow_instances",
          )
        ).rows,
      ).toEqual([{ current_stage_instance_id: source }]);
      expect(
        (
          await client.query(
            "SELECT status, assigned_user_id, result FROM app_workflow_tasks",
          )
        ).rows,
      ).toEqual([
        {
          status: "IN_PROGRESS",
          assigned_user_id: actor,
          result: { amount: 100 },
        },
      ]);
      expect(
        (await client.query("SELECT action FROM app_workflow_audit_entries"))
          .rows,
      ).toEqual([
        { action: "WORKFLOW_REFERRAL_RETURNED" },
        { action: "WORKFLOW_REFERRAL_COMPLETED" },
      ]);
      expect(await complete()).toBeNull();
      expect(
        (
          await client.query(
            "SELECT count(*)::integer AS count FROM app_workflow_audit_entries",
          )
        ).rows[0].count,
      ).toBe(2);
    },
  );

  it("blocks completion only for active blocking referrals", async () => {
    async function allowed() {
      const result = await database.execute(sql`
        SELECT ${workflowTaskControlAllowsCompletion} AS allowed
        FROM app_workflow_tasks task
        JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
        WHERE task.id = ${task}::uuid
      `);
      return result.rows[0].allowed;
    }
    expect(await allowed()).toBe(false);
    await client.query(
      "UPDATE app_workflow_referrals SET source_task_behavior = 'OPEN'",
    );
    expect(await allowed()).toBe(true);
    await client.query(
      "UPDATE app_workflow_referrals SET source_task_behavior = 'BLOCKED'",
    );
    await complete();
    expect(await allowed()).toBe(true);
  });

  it("leaves onward routing to the workflow when return is disabled", async () => {
    await client.query(
      "UPDATE app_workflow_referrals SET return_to_referrer = 'NO'",
    );
    expect((await complete())?.returnTarget).toBeNull();
    expect(
      (
        await client.query(
          "SELECT current_stage_instance_id FROM app_workflow_instances",
        )
      ).rows,
    ).toEqual([{ current_stage_instance_id: referred }]);
    expect(
      (await client.query("SELECT status FROM app_workflow_referrals")).rows,
    ).toEqual([{ status: "COMPLETED" }]);
  });

  it("preserves a hold on the referring stage", async () => {
    await client.query(
      "UPDATE app_workflow_stage_instances SET status = 'BLOCKED'",
    );
    expect((await complete())?.returnTarget?.targetStageInstanceId).toBe(
      source,
    );
    expect(
      (await client.query("SELECT status FROM app_workflow_stage_instances"))
        .rows,
    ).toEqual([{ status: "BLOCKED" }]);
  });

  it("does not revive work completed while a nonblocking referral was open", async () => {
    await client.query("UPDATE app_workflow_tasks SET status = 'COMPLETED'");
    expect((await complete())?.returnTarget).toBeNull();
    expect(
      (
        await client.query(
          "SELECT current_stage_instance_id FROM app_workflow_instances",
        )
      ).rows,
    ).toEqual([{ current_stage_instance_id: referred }]);
  });

  it("rejects a source task from another stage or workflow", async () => {
    await client.query("UPDATE app_workflow_tasks SET stage_instance_id = $1", [
      randomUUID(),
    ]);
    expect((await complete())?.returnTarget).toBeNull();
    await client.query("UPDATE app_workflow_tasks SET stage_instance_id = $1", [
      source,
    ]);
    await client.query(
      "UPDATE app_workflow_stage_instances SET workflow_instance_id = $1",
      [randomUUID()],
    );
    expect(
      await loadWorkflowReferralReturn(database as never, referred),
    ).toBeNull();
  });

  it("rolls back completion and handoff if audit writing fails", async () => {
    await client.query(
      "ALTER TABLE app_workflow_audit_entries ADD CONSTRAINT reject_return CHECK (action <> 'WORKFLOW_REFERRAL_RETURNED')",
    );
    try {
      await expect(complete()).rejects.toThrow();
      expect(
        (await client.query("SELECT status FROM app_workflow_referrals")).rows,
      ).toEqual([{ status: "ACTIVE" }]);
      expect(
        (
          await client.query(
            "SELECT current_stage_instance_id FROM app_workflow_instances",
          )
        ).rows,
      ).toEqual([{ current_stage_instance_id: referred }]);
    } finally {
      await client.query(
        "ALTER TABLE app_workflow_audit_entries DROP CONSTRAINT reject_return",
      );
    }
  });
});
