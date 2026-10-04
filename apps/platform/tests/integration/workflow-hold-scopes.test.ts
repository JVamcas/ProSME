import pg from "pg";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
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
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import * as databaseSchema from "@/db/schema";
import { resumeWorkflowHold } from "@/modules/workflows/infrastructure/WorkflowHoldRepository";
import { workflowTaskEffectiveDeadline } from "@/modules/workflows/infrastructure/WorkflowSlaDeadline";
import { lockStageActivationTarget } from "@/modules/workflows/infrastructure/StageActivationRepository";
import { lockAuthoritativeEligibilityTask } from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityExecutionRepository";
import { writeTaskReviewDraft } from "@/modules/workflows/infrastructure/WorkflowTaskReviewRepository";
import { processConfiguredWorkflowDeadlineBatch } from "@/modules/workflows/application/runtime/ServerWorkflowDeadlineService";
import { seedNotificationConfiguration } from "@/modules/notifications/infrastructure/NotificationConfigurationSeedRepository";
import type { WorkflowHoldScope } from "@/modules/workflows/domain/runtime/WorkflowHold";
import { formContextIds as id } from "../support/WorkflowEligibilityFormContextFixture";
import {
  deadlineFixtureIds as extra,
  installWorkflowDeadlineFixture,
} from "../support/WorkflowDeadlineFixture";

import {
  insertWorkflowTestHold,
  readHeldWorkflowTestTasks,
  installWorkflowHoldBusiness,
  installWorkflowHoldParallelBranch,
  readHoldStaffProjections,
} from "../support/WorkflowHoldDatabaseFixture";

const enabled = process.env.RUN_WORKFLOW_HOLD_DATABASE_TESTS === "true";
const secret = "isolated-hold-scheduler-test-service-secret";
let pool: pg.Pool;
let client: pg.PoolClient;
let endFixture: () => void;
let fixtureTransaction: Promise<unknown>;
let parallelTask: string;

beforeAll(async () => {
  if (!enabled) return;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  client = await pool.connect();
  const ready = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  endFixture = finish.resolve;
  fixtureTransaction = drizzle(client, { schema: databaseSchema })
    .transaction(async (transaction) => {
      vi.mocked(getDatabase).mockReturnValue(transaction as never);
      const migration = readFileSync(
        "drizzle/0159_workflow_hold_scopes.sql",
        "utf8",
      );
      await client.query(migration);
      await client.query(migration);
      await seedNotificationConfiguration();
      await installWorkflowDeadlineFixture(client, async () => ({
        businessId: await installWorkflowHoldBusiness(client),
        formVersionId: id.coiVersion,
        values: {},
      }));
      ({ parallelTask } =
        await installWorkflowHoldParallelBranch(client));
      ready.resolve();
      await finish.promise;
      throw new Error("ROLLBACK_HOLD_FIXTURE");
    })
    .catch((error: Error) => {
      if (error.message !== "ROLLBACK_HOLD_FIXTURE") ready.reject(error);
    });
  await ready.promise;
  process.env.WORKFLOW_PROCESSOR_SECRET = secret;
}, 30_000);

beforeEach(async () => {
  if (enabled) await client.query("SAVEPOINT hold_case");
});
afterEach(async () => {
  if (enabled) await client.query("ROLLBACK TO SAVEPOINT hold_case");
});
afterAll(async () => {
  endFixture?.();
  await fixtureTransaction;
  client?.release();
  await pool?.end();
});

const placeHold = (scope: WorkflowHoldScope, reviewAt?: Date) =>
  insertWorkflowTestHold(client, scope, reviewAt);
const heldTasks = () => readHeldWorkflowTestTasks(parallelTask);

(enabled ? describe : describe.skip)(
  "hold scopes against isolated PostgreSQL",
  () => {
    it.each([
      ["TASK", () => [id.unboundTask]],
      ["STAGE", () => [id.unboundTask, id.commandTask]],
      ["APPLICATION", () => [id.unboundTask, id.commandTask, parallelTask]],
    ] as const)(
      "isolates %s without changing progress or applicant status",
      async (scope, affected) => {
        const before = await client.query(
          "SELECT status, result, assigned_user_id FROM app_workflow_tasks WHERE id = $1",
          [id.unboundTask],
        );
        const publicBefore = await client.query(
          "SELECT application.status, definition.applicant_status FROM app_applications application JOIN app_workflow_instances workflow ON workflow.application_id = application.id JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = workflow.id JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id WHERE application.id = $1 ORDER BY stage.id",
          [id.application],
        );
        expect(await placeHold(scope)).not.toBeNull();
        expect(await heldTasks()).toEqual(affected().sort());
        const after = await client.query(
          "SELECT status, result, assigned_user_id FROM app_workflow_tasks WHERE id = $1",
          [id.unboundTask],
        );
        expect(after.rows).toEqual(before.rows);
        expect(
          (
            await client.query(
              "SELECT application.status, definition.applicant_status FROM app_applications application JOIN app_workflow_instances workflow ON workflow.application_id = application.id JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = workflow.id JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id WHERE application.id = $1 ORDER BY stage.id",
              [id.application],
            )
          ).rows,
        ).toEqual(publicBefore.rows);
        const { progress, staffApplication } = await readHoldStaffProjections();
        expect(staffApplication.processingStatus).toBe(
          scope === "APPLICATION" ? "ON_HOLD" : null,
        );
        expect(staffApplication.applicantStatus).toBe("UNDER_REVIEW");
        const stage = progress?.stages.find(
          (item) => item.id === id.stageInstance,
        );
        expect(stage?.status).toBe("ACTIVE");
        expect(stage?.processingStatus).toBe(
          scope === "TASK" ? null : "ON_HOLD",
        );
        expect(progress?.processingStatus).toBe(
          scope === "APPLICATION" ? "ON_HOLD" : null,
        );
      },
    );

    it("blocks held drafts, eligibility evaluation and application stage activation", async () => {
      expect(
        await writeTaskReviewDraft({
          actorId: id.actor,
          correlationId: crypto.randomUUID(),
          taskId: id.unboundTask,
          comments: [{ key: "before", value: "Saved before hold" }],
        }),
      ).toBe(true);
      expect(
        await lockStageActivationTarget(
          getDatabase() as never,
          id.workflow,
          extra.reworkStage,
        ),
      ).not.toBeNull();
      expect(
        await lockAuthoritativeEligibilityTask(
          getDatabase() as never,
          id.inheritedTask,
          id.actor,
        ),
      ).not.toBeNull();
      await placeHold("APPLICATION");
      expect(
        await lockAuthoritativeEligibilityTask(
          getDatabase() as never,
          id.inheritedTask,
          id.actor,
        ),
      ).toBeNull();
      expect(
        await writeTaskReviewDraft({
          actorId: id.actor,
          correlationId: crypto.randomUUID(),
          taskId: id.unboundTask,
          comments: [{ key: "held", value: "Should not save" }],
        }),
      ).toBe(false);
      expect(
        await lockStageActivationTarget(
          getDatabase() as never,
          id.workflow,
          extra.reworkStage,
        ),
      ).toBeNull();
    });

    it("ending a specific hold preserves overlapping broader holds", async () => {
      const taskHold = await placeHold("TASK");
      await placeHold("STAGE");
      await placeHold("APPLICATION");
      expect(
        await resumeWorkflowHold(getDatabase() as never, {
          actorId: id.actor,
          correlationId: crypto.randomUUID(),
          holdId: taskHold!.id,
          resumedAt: new Date(),
          workflowInstanceId: id.workflow,
        }),
      ).not.toBeNull();
      expect(await heldTasks()).toEqual(
        [id.unboundTask, id.commandTask, parallelTask].sort(),
      );
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS total FROM app_workflow_holds WHERE status = 'ACTIVE' AND workflow_instance_id = $1",
            [id.workflow],
          )
        ).rows[0].total,
      ).toBe(2);
    });

    it("automatically ends due holds once and addresses only their initiator", async () => {
      await placeHold("TASK", new Date(Date.now() - 3_600_000));
      await placeHold("APPLICATION");
      expect(
        await processConfiguredWorkflowDeadlineBatch(
          `Bearer ${secret}`,
          crypto.randomUUID(),
        ),
      ).toMatchObject({ processed: 1, failed: 0 });
      expect(
        await processConfiguredWorkflowDeadlineBatch(
          `Bearer ${secret}`,
          crypto.randomUUID(),
        ),
      ).toMatchObject({ processed: 0, failed: 0 });
      const notifications = await client.query(
        "SELECT context, id FROM app_notification_outbox WHERE event_key = 'workflow.hold.resumed' AND context ->> 'workflowInstanceId' = $1",
        [id.workflow],
      );
      expect(notifications.rows).toHaveLength(1);
      expect(notifications.rows[0].context.processingStillHeld).toBe(true);
      const deliveries = await client.query(
        "SELECT recipient_user_id, recipient_type FROM app_notification_deliveries WHERE outbox_id = $1",
        [notifications.rows[0].id],
      );
      expect(deliveries.rows).toEqual([
        { recipient_user_id: id.actor, recipient_type: "ACTION_ACTOR" },
      ]);
      expect(await heldTasks()).toEqual(
        [id.unboundTask, id.commandTask, parallelTask].sort(),
      );
    });

    it("merges overlapping scoped SLA pauses without delaying peers", async () => {
      await client.query(
        "UPDATE app_workflow_tasks SET created_at = now() - interval '10 hours', due_at = now() + interval '1 hour' WHERE stage_instance_id = $1",
        [id.stageInstance],
      );
      const hold = await placeHold("TASK");
      await client.query(
        "UPDATE app_workflow_holds SET held_at = now() - interval '5 hours', resumed_at = now() - interval '2 hours', resumed_by = $2, status = 'RESUMED' WHERE id = $1",
        [hold!.id, id.actor],
      );
      const result = await getDatabase().execute<{
        id: string;
        pausedHours: number;
      }>(sql`
      SELECT task.id, extract(epoch FROM (${workflowTaskEffectiveDeadline(sql`task`)} - task.due_at)) / 3600 AS "pausedHours"
      FROM app_workflow_tasks task WHERE task.id IN (${id.unboundTask}::uuid, ${id.commandTask}::uuid)
    `);
      expect(
        Number(
          result.rows.find((row) => row.id === id.unboundTask)?.pausedHours,
        ),
      ).toBe(3);
      expect(
        Number(
          result.rows.find((row) => row.id === id.commandTask)?.pausedHours,
        ),
      ).toBe(0);
    });
  },
);
