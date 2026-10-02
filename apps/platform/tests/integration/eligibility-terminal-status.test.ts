import pg from "pg";
import { readFileSync } from "node:fs";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { seedNotificationConfiguration } from "@/modules/notifications/infrastructure/NotificationConfigurationSeedRepository";
import { workflowApprovalEligibilityReady } from "@/modules/workflows/infrastructure/WorkflowApprovalEligibilityReadiness";
import { createAuthoritativeEligibilityOutcomeRecord } from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityRepository";
import { terminateWorkflowOnEligibilityFailure } from "@/modules/workflows/application/runtime/ServerWorkflowEligibilityFailureService";
import { findAuthoritativeEligibilityExecutionByCommand } from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityExecutionRepository";
import { captureApplicationTerminalStatus } from "@/modules/applications/application/ServerApplicationTerminalStatusService";
import {
  formContextIds as id,
  installWorkflowEligibilityFormContextFixture,
} from "../support/WorkflowEligibilityFormContextFixture";

const enabled = process.env.RUN_ELIGIBILITY_TERMINAL_DATABASE_TESTS === "true";
const pool = enabled ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
let client: pg.PoolClient;
let database: NodePgDatabase;
let formVersionId: string;
const correlationId = crypto.randomUUID();
const finding = {
  applicantMessage: "Registration required", failureType: "HARD_FAIL" as const,
  reasonCode: "NOT_REGISTERED", ruleId: crypto.randomUUID(),
};

beforeAll(async () => {
  if (!pool) return;
  client = await pool.connect();
  await client.query("BEGIN");
  database = drizzle(client);
  ({ formVersionId } = await installWorkflowEligibilityFormContextFixture(client));
  await client.query("UPDATE app_workflow_tasks SET form_version_id = NULL WHERE id = $1", [id.commandTask]);
});

beforeEach(async () => {
  if (enabled) await client.query("SAVEPOINT eligibility_case");
});
afterEach(async () => {
  if (enabled) await client.query("ROLLBACK TO SAVEPOINT eligibility_case");
});
afterAll(async () => {
  if (client) {
    await client.query("ROLLBACK");
    client.release();
  }
  await pool?.end();
});

async function outcome(hardFailure = false, evaluationNumber = 1) {
  const created = await createAuthoritativeEligibilityOutcomeRecord(database as never, {
    applicationId: id.application,
    commandKey: `terminal-test-${evaluationNumber}`,
    contextReference: {
      applicationId: id.application, applicationRowVersion: 1,
      businessProfileUpdatedAt: new Date().toISOString(),
      correlationId, fundingCallId: id.call,
    },
    eligible: !hardFailure, evaluatedAt: new Date(), evaluatedBy: id.actor,
    evaluationNumber, evaluatedValueProvenance: {}, evaluatedValues: {},
    finalOutcome: hardFailure ? "INELIGIBLE" : "ELIGIBLE",
    hardFailures: hardFailure ? [finding] : [], manualScreeningRequired: false,
    ruleOutcomes: [], ruleSetVersionId: id.rulesVersion, ruleSetVersionNumber: 1,
    softFailures: [], warnings: [], workflowTaskId: id.commandTask,
  });
  await client.query(
    "UPDATE app_workflow_tasks SET status = 'COMPLETED', result = $2 WHERE id = $1",
    [id.commandTask, JSON.stringify({ evaluationId: created.id, evaluatedFormValues: {} })],
  );
  return created;
}
async function readiness() {
  const result = await database.execute<{ ready: boolean }>(sql`
    SELECT ${workflowApprovalEligibilityReady(sql`${id.workflow}::uuid`)} AS ready
  `);
  return result.rows[0].ready;
}

(enabled ? describe : describe.skip)("eligibility termination against PostgreSQL", () => {
  it("persists configured failure statuses using the shared public-status catalogue", async () => {
    await client.query(readFileSync("drizzle/0148_eligibility_terminal_status_event.sql", "utf8"));
    const version = await client.query(
      `INSERT INTO app_workflow_definition_versions (definition_id, version_number, created_by)
       VALUES ($1, 2, $2) RETURNING id`, [id.definition, id.actor],
    );
    const stages = await client.query(
      `INSERT INTO app_workflow_stage_definitions
       (version_id, code, name, sequence, applicant_status, applicant_label, applicant_description)
       VALUES ($1, 'INELIGIBLE', 'Ineligible', 1, 'INELIGIBLE', 'Ineligible', 'Decision'),
         ($1, 'REJECTED', 'Rejected', 2, 'REJECTED', 'Rejected', 'Decision'),
         ($1, 'REJECTED_INCOMPLETE', 'Rejected incomplete', 3, 'REJECTED_INCOMPLETE', 'Rejected incomplete', 'Decision')
       RETURNING applicant_status`, [version.rows[0].id],
    );
    expect(stages.rows).toHaveLength(3);
  });

  it("blocks approval before screening has run", async () => {
    expect(await readiness()).toBe(false);
  });

  it("allows a current passing evaluation", async () => {
    await outcome();
    expect(await readiness()).toBe(true);
  });

  it("blocks a recorded hard failure even before automatic termination", async () => {
    await outcome(true);
    expect(await readiness()).toBe(false);
  });

  it("blocks a stale result that references an earlier evaluation", async () => {
    const first = await outcome();
    await outcome(true, 2);
    await client.query("UPDATE app_workflow_tasks SET result = $2 WHERE id = $1", [
      id.commandTask, JSON.stringify({ evaluationId: first.id }),
    ]);
    expect(await readiness()).toBe(false);
  });

  it("allows a current soft failure requiring a manual decision", async () => {
    const created = await createAuthoritativeEligibilityOutcomeRecord(database as never, {
      applicationId: id.application, commandKey: "soft-test",
      contextReference: {
        applicationId: id.application, applicationRowVersion: 1,
        businessProfileUpdatedAt: new Date().toISOString(),
        correlationId, fundingCallId: id.call,
      },
      eligible: true, evaluatedAt: new Date(), evaluatedBy: id.actor,
      evaluationNumber: 1, evaluatedValueProvenance: {}, evaluatedValues: {},
      finalOutcome: null, hardFailures: [], manualScreeningRequired: true,
      ruleOutcomes: [], ruleSetVersionId: id.rulesVersion, ruleSetVersionNumber: 1,
      softFailures: [{ ...finding, failureType: "SOFT_FAIL" }], warnings: [],
      workflowTaskId: id.commandTask,
    });
    await client.query("UPDATE app_workflow_tasks SET result = $2 WHERE id = $1", [
      id.commandTask, JSON.stringify({ evaluationId: created.id }),
    ]);
    expect(await readiness()).toBe(true);
  });

  it("blocks changed reviewer answers until screening is rerun", async () => {
    await outcome();
    await client.query("UPDATE app_workflow_tasks SET form_version_id = $2 WHERE id = $1", [id.commandTask, formVersionId]);
    await client.query(
      `INSERT INTO app_form_responses
       (workflow_task_id, form_version_id, respondent_user_id, values, created_by, updated_by)
       VALUES ($1, $2, $3, '{"REGISTERED":false}', $3, $3)`,
      [id.commandTask, formVersionId, id.actor],
    );
    expect(await readiness()).toBe(false);
    await client.query("UPDATE app_form_responses SET values = '{}' WHERE workflow_task_id = $1", [id.commandTask]);
    expect(await readiness()).toBe(true);
  });

  it("terminates, cancels open work, records evidence and queues one applicant delivery", async () => {
    const result = await outcome(true);
    const command = {
      actorId: id.actor, config: {}, correlationId,
      evaluatedAt: result.evaluatedAt, evaluationId: result.id,
      hardFailures: result.hardFailures, stageInstanceId: id.stageInstance,
      taskId: id.commandTask, workflowInstanceId: id.workflow,
    };
    expect(await terminateWorkflowOnEligibilityFailure(database as never, command)).toBe("INELIGIBLE");
    const workflow = await client.query("SELECT status, terminal_outcome, public_status FROM app_workflow_instances WHERE id = $1", [id.workflow]);
    expect(workflow.rows[0]).toMatchObject({
      status: "REJECTED", terminal_outcome: "INELIGIBLE",
      public_status: expect.objectContaining({ status: "INELIGIBLE", label: "Ineligible" }),
    });
    const tasks = await client.query("SELECT status FROM app_workflow_tasks WHERE stage_instance_id = $1", [id.stageInstance]);
    expect(tasks.rows.filter((task) => task.status === "CANCELLED")).toHaveLength(3);
    const events = await client.query("SELECT payload FROM app_workflow_events WHERE workflow_instance_id = $1 AND event_code = 'application.terminal-status-reached'", [id.workflow]);
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0].payload).toMatchObject({
      newStatus: "INELIGIBLE", failedRuleIds: [finding.ruleId], reasonCodes: [finding.reasonCode],
    });
    const receipt = await findAuthoritativeEligibilityExecutionByCommand(database as never, "terminal-test-1");
    expect(receipt).toMatchObject({ terminalStatus: "INELIGIBLE", workflowTaskId: id.commandTask });
    await captureApplicationTerminalStatus(database as never, {
      ...command, newStatus: "INELIGIBLE", statusLabel: "Ineligible",
      occurredAt: result.evaluatedAt, sourceIdempotencyKey: `eligibility:${result.id}`,
      failedRuleIds: [finding.ruleId], reasonCodes: [finding.reasonCode],
    });
    const deliveries = await client.query(
      `SELECT count(*)::int AS count FROM app_notification_deliveries delivery
       JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id
       WHERE occurrence.aggregate_id = $1`, [id.application],
    );
    expect(deliveries.rows[0].count).toBe(1);
    const audits = await client.query("SELECT count(*)::int AS count FROM app_workflow_audit_entries WHERE workflow_instance_id = $1 AND action = 'APPLICATION_TERMINAL_STATUS_REACHED'", [id.workflow]);
    expect(audits.rows[0].count).toBe(1);
  });


  it("uses recipients chosen in the UI rule instead of forcing the applicant", async () => {
    const configuredRecipientId = crypto.randomUUID();
    await client.query(
      `DELETE FROM app_notification_event_rule_recipients WHERE rule_id = (
         SELECT rule.id FROM app_notification_event_rules rule
         JOIN app_notification_events event ON event.id = rule.event_id
         WHERE event.event_key = 'application.terminal-status-reached'
       )`,
    );
    await client.query(
      `INSERT INTO app_notification_event_rule_recipients
       (id, rule_id, recipient_type, recipient_user_id, is_required)
       SELECT $1, rule.id, 'SPECIFIC_USER', $2, true
       FROM app_notification_event_rules rule
       JOIN app_notification_events event ON event.id = rule.event_id
       WHERE event.event_key = 'application.terminal-status-reached'`,
      [configuredRecipientId, id.otherActor],
    );
    await client.query(
      `INSERT INTO app_notification_event_rule_channels (rule_recipient_id, channel_id)
       SELECT $1, id FROM app_notification_channels WHERE code = 'EMAIL'`,
      [configuredRecipientId],
    );
    await client.query(readFileSync("drizzle/0148_eligibility_terminal_status_event.sql", "utf8"));
    vi.mocked(getDatabase).mockReturnValue({
      transaction: async (work: (transaction: unknown) => Promise<unknown>) => work(database),
    } as never);
    await seedNotificationConfiguration();
    const result = await outcome(true);
    await terminateWorkflowOnEligibilityFailure(database as never, {
      actorId: id.actor, config: {}, correlationId,
      evaluatedAt: result.evaluatedAt, evaluationId: result.id,
      hardFailures: result.hardFailures, stageInstanceId: id.stageInstance,
      taskId: id.commandTask, workflowInstanceId: id.workflow,
    });
    const deliveries = await client.query(
      `SELECT delivery.recipient_user_id FROM app_notification_deliveries delivery
       JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id
       WHERE occurrence.aggregate_id = $1`, [id.application],
    );
    expect(deliveries.rows).toEqual([{ recipient_user_id: id.otherActor }]);
  });

  it("rolls back terminal status and notification together", async () => {
    const result = await outcome(true);
    await client.query("SAVEPOINT termination_rollback");
    await terminateWorkflowOnEligibilityFailure(database as never, {
      actorId: id.actor, config: {}, correlationId,
      evaluatedAt: result.evaluatedAt, evaluationId: result.id,
      hardFailures: result.hardFailures, stageInstanceId: id.stageInstance,
      taskId: id.commandTask, workflowInstanceId: id.workflow,
    });
    await client.query("ROLLBACK TO SAVEPOINT termination_rollback");
    expect((await client.query("SELECT status FROM app_workflow_instances WHERE id = $1", [id.workflow])).rows[0].status).toBe("ACTIVE");
    expect((await client.query("SELECT count(*)::int AS count FROM app_notification_outbox WHERE aggregate_id = $1", [id.application])).rows[0].count).toBe(0);
  });
});
