import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import { seedNotificationConfiguration } from "@/modules/notifications/infrastructure/NotificationConfigurationSeedRepository";
import { captureWorkflowRfiLifecycleNotification } from "@/modules/workflows/application/runtime/ServerWorkflowRfiNotificationService";
import { captureWorkflowDeadlineNotification } from "@/modules/workflows/application/runtime/ServerWorkflowDeadlineNotificationService";
import { loadWorkflowRfiNotificationSource } from "@/modules/workflows/infrastructure/WorkflowRfiNotificationRepository";
import { formContextIds as id } from "../support/WorkflowEligibilityFormContextFixture";
import { installWorkflowDeadlineFixture, insertDeadlineRfi } from "../support/WorkflowDeadlineFixture";
import type { WorkflowDeadlineCandidate } from "@/modules/workflows/domain/runtime/WorkflowDeadline";

const enabled = process.env.RUN_WORKFLOW_DEADLINE_DATABASE_TESTS === "true";
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
  fixtureTransaction = drizzle(client, { schema }).transaction(async (transaction) => {
    vi.mocked(getDatabase).mockReturnValue(transaction as never);
    await seedNotificationConfiguration();
    await installWorkflowDeadlineFixture(client);
    ready.resolve();
    await finish.promise;
    throw new Error("ROLLBACK_RFI_NOTIFICATION_FIXTURE");
  }).catch((error: Error) => {
    if (error.message !== "ROLLBACK_RFI_NOTIFICATION_FIXTURE") ready.reject(error);
  });
  await ready.promise;
}, 30_000);

beforeEach(async () => {
  if (enabled) await client.query("SAVEPOINT rfi_notification_case");
});
afterEach(async () => {
  if (enabled) await client.query("ROLLBACK TO SAVEPOINT rfi_notification_case");
});
afterAll(async () => {
  endFixture?.();
  await fixtureTransaction;
  client?.release();
  await pool?.end();
});

(enabled ? describe : describe.skip)("information request notification persistence", () => {
  it("projects only the notification source and rejects a missing request", async () => {
    const requestId = await insertDeadlineRfi(client, "CLOSE_REQUEST", false);
    const source = await loadWorkflowRfiNotificationSource(getDatabase() as never, requestId);
    expect(source).toMatchObject({
      applicationId: id.application,
      recipientUserId: id.actor,
      stageInstanceId: id.stageInstance,
      workflowInstanceId: id.workflow,
      question: "Supply information",
      respondedAt: null,
      closedAt: null,
    });
    expect(source).not.toHaveProperty("instructions");
    await expect(loadWorkflowRfiNotificationSource(
      getDatabase() as never,
      crypto.randomUUID(),
    )).rejects.toThrow("context is unavailable");
  });

  it("persists one occurrence and delivery for each of the five events without replay duplicates", async () => {
    const requestId = await insertDeadlineRfi(client, "CLOSE_REQUEST", false);
    await client.query(
      "UPDATE app_workflow_rfis SET responded_at = now(), closed_at = now(), question = $2 WHERE id = $1",
      [requestId, "A".repeat(12_000)],
    );
    await client.query(
      "UPDATE app_workflow_tasks SET assigned_user_id = $2 WHERE stage_instance_id = $1",
      [id.stageInstance, id.otherActor],
    );
    const transaction = getDatabase() as never;
    for (const event of ["created", "responded", "closed"] as const) {
      await captureWorkflowRfiLifecycleNotification(transaction, requestId, event);
      await captureWorkflowRfiLifecycleNotification(transaction, requestId, event);
    }
    const occurredAt = new Date();
    for (const kind of ["RFI_REMINDER", "RFI_EXPIRED"] as const) {
      const candidate = {
        kind,
        occurrenceKey: `${kind}:${requestId}`,
        scheduledFor: occurredAt,
        sourceId: requestId,
        stageInstanceId: id.stageInstance,
        taskId: id.unboundTask,
        workflowInstanceId: id.workflow,
      } satisfies WorkflowDeadlineCandidate;
      const rfi = { deadlineAt: occurredAt, question: "A".repeat(12_000) };
      await captureWorkflowDeadlineNotification(transaction, candidate, "scheduled-test", occurredAt, rfi);
      await captureWorkflowDeadlineNotification(transaction, candidate, "scheduled-test", occurredAt, rfi);
    }
    const result = await client.query(
      `SELECT outbox.event_key, count(DISTINCT outbox.id)::integer AS occurrences,
        count(delivery.id)::integer AS deliveries,
        bool_and(delivery.recipient_user_id = $2::uuid) AS owner_recipient
       FROM app_notification_outbox outbox
       LEFT JOIN app_notification_deliveries delivery ON delivery.outbox_id = outbox.id
       WHERE outbox.context ->> 'workflowInstanceId' = $1::uuid::text
       GROUP BY outbox.event_key ORDER BY outbox.event_key`,
      [id.workflow, id.actor],
    );
    expect(result.rows).toEqual(["closed", "created", "expired", "reminder", "responded"].map((event) => ({
      event_key: `workflow.information-request.${event}`,
      occurrences: 1,
      deliveries: 1,
      owner_recipient: event !== "responded" && event !== "expired",
    })));
  });
});
