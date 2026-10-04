import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
import {
  hasCommittedEscalationWork,
  lockEscalationCancellationContext,
  persistEscalationCancellation,
} from "@/modules/workflows/infrastructure/WorkflowEscalationCancellationRepository";

const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const databaseTests = enabled ? describe : describe.skip;
const client = enabled
  ? new pg.Client({ connectionString: process.env.DATABASE_URL })
  : null;
const ids = {
  a: randomUUID(),
  b: randomUUID(),
  c: randomUUID(),
  role: randomUUID(),
  task: randomUUID(),
  stage: randomUUID(),
  workflow: randomUUID(),
  first: randomUUID(),
  second: randomUUID(),
  correlation: randomUUID(),
};

beforeAll(async () => {
  if (client) await client.connect();
});
afterAll(async () => {
  if (client) await client.end();
});
beforeEach(async () => {
  if (!client) return;
  await client.query("BEGIN");
  // Temporary tables shadow application tables. These checks never mutate live data.
  await client.query(`
    CREATE TEMP TABLE app_capabilities (id uuid DEFAULT gen_random_uuid(), code text UNIQUE, description text) ON COMMIT DROP;
    CREATE TEMP TABLE app_role_capabilities (role_id uuid, capability_id uuid, PRIMARY KEY (role_id, capability_id)) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_instances (id uuid PRIMARY KEY, status text) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_stage_instances (id uuid PRIMARY KEY, workflow_instance_id uuid, status text, row_version integer) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_tasks (id uuid PRIMARY KEY, stage_instance_id uuid,
      assigned_user_id uuid, assigned_role_id uuid, status text, row_version integer,
      started_at timestamptz, completed_at timestamptz, claimed_at timestamptz, result jsonb) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_escalations (id uuid PRIMARY KEY, task_id uuid,
      escalated_by uuid, trigger text, source_assigned_user_id uuid, source_assigned_role_id uuid,
      status text, escalated_at timestamptz, resolved_at timestamptz, resolved_by uuid) ON COMMIT DROP;
    CREATE UNIQUE INDEX app_workflow_escalations_active_task_unique ON app_workflow_escalations(task_id) WHERE status = 'ACTIVE';
    CREATE TEMP TABLE app_form_responses (workflow_task_id uuid, respondent_user_id uuid, status text, completed_at timestamptz) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_events (id uuid DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now(), workflow_instance_id uuid, event_code text, actor_id uuid, correlation_id uuid, payload jsonb) ON COMMIT DROP;
    CREATE TEMP TABLE app_workflow_audit_entries (id uuid DEFAULT gen_random_uuid(), runtime_sequence bigint GENERATED ALWAYS AS IDENTITY,
      idempotency_key text, reason text, created_at timestamptz DEFAULT now(), actor_id uuid, action text, target_type text, target_id text,
      correlation_id uuid, workflow_instance_id uuid, stage_instance_id uuid, task_id uuid,
      before jsonb, after jsonb) ON COMMIT DROP;
  `);
  await client.query(
    "INSERT INTO app_capabilities (code) VALUES ('workflow.task.assigned.process')",
  );
  await client.query(
    "INSERT INTO app_role_capabilities SELECT $1, id FROM app_capabilities",
    [ids.role],
  );
  const migration = await readFile(
    new URL(
      "../../drizzle/0158_workflow_escalation_cancellation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await client.query(migration);
  await client.query(migration);
  await client.query(
    "INSERT INTO app_workflow_instances VALUES ($1, 'ACTIVE')",
    [ids.workflow],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_instances VALUES ($1, $2, 'ACTIVE', 3)",
    [ids.stage, ids.workflow],
  );
  await client.query(
    "INSERT INTO app_workflow_tasks (id, stage_instance_id, assigned_user_id, status, row_version, result) VALUES ($1, $2, $3, 'IN_PROGRESS', 3, '{\"draft\":\"preserved\"}')",
    [ids.task, ids.stage, ids.c],
  );
  await client.query(
    `INSERT INTO app_workflow_escalations (id, task_id, escalated_by, trigger,
    source_assigned_user_id, source_assigned_role_id, status, escalated_at, parent_escalation_id)
    VALUES ($1,$3,$4,'MANUAL',$4,$6,'ACTIVE',now() - interval '2 minutes',NULL),
      ($2,$3,$5,'MANUAL',$5,NULL,'ACTIVE',now() - interval '1 minute',$1)`,
    [ids.first, ids.second, ids.task, ids.a, ids.b, ids.role],
  );
});
afterEach(async () => {
  if (client) await client.query("ROLLBACK");
});

databaseTests("escalation cancellation chain and migration", () => {
  it.each(["first", "second"] as const)(
    "cancels from the %s escalation and preserves drafts",
    async (from) => {
      const transaction = drizzle(client!) as never;
      const context = await lockEscalationCancellationContext(
        transaction,
        ids.task,
        ids[from],
      );
      expect(context).not.toBeNull();
      const sender = from === "first" ? ids.a : ids.b;
      await persistEscalationCancellation(transaction, context!, {
        actorId: sender,
        taskId: ids.task,
        correlationId: ids.correlation,
      });
      const task = await client!.query(
        "SELECT assigned_user_id, assigned_role_id, status, result FROM app_workflow_tasks",
      );
      expect(task.rows[0]).toMatchObject({
        assigned_user_id: sender,
        assigned_role_id: from === "first" ? ids.role : null,
        status: "PENDING",
        result: { draft: "preserved" },
      });
      const escalation = await client!.query(
        "SELECT id, status FROM app_workflow_escalations ORDER BY escalated_at",
      );
      expect(escalation.rows.map((row) => row.status)).toEqual(
        from === "first" ? ["RESOLVED", "RESOLVED"] : ["ACTIVE", "RESOLVED"],
      );
      const audits = await client!.query(
        "SELECT action FROM app_workflow_audit_entries",
      );
      expect(
        audits.rows.filter(
          (row) => row.action === "WORKFLOW_ESCALATION_CANCELLED",
        ),
      ).toHaveLength(from === "first" ? 2 : 1);
      expect(
        audits.rows.filter((row) => row.action === "TASK_REASSIGNED"),
      ).toHaveLength(1);
    },
  );
  it("blocks recall across a committed intermediate review but permits recalling its later draft escalation", async () => {
    await client!.query(
      "INSERT INTO app_form_responses VALUES ($1,$2,'COMPLETED',now() - interval '90 seconds')",
      [ids.task, ids.b],
    );
    const transaction = drizzle(client!) as never;
    await expect(
      hasCommittedEscalationWork(transaction, ids.task, ids.first),
    ).resolves.toBe(true);
    await expect(
      hasCommittedEscalationWork(transaction, ids.task, ids.second),
    ).resolves.toBe(false);
    const grants = await client!.query(
      "SELECT count(*)::int AS count FROM app_role_capabilities grant_record JOIN app_capabilities permission ON permission.id=grant_record.capability_id WHERE permission.code='workflow.escalation.own.cancel'",
    );
    expect(grants.rows[0].count).toBe(1);
  });
});
