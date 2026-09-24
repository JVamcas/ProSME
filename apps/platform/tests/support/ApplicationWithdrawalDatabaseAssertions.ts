import { expect } from "vitest";

import { withdrawOwnedApplication } from "@/modules/applications/infrastructure/ApplicationWithdrawalRepository";
import { readOwnedApplicationStatus } from "@/modules/applications/infrastructure/ApplicationListRepository";

type Query = (text: string, values?: unknown[]) => Promise<{
  rows: Record<string, unknown>[];
}>;

export async function assertApplicationWithdrawal(input: {
  applicationId: string;
  ownerId: string;
  otherOwnerId: string;
  query: Query;
}) {
  await input.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'withdrawal-other@example.test', 'Other Applicant', 'applicant', 'active')`,
    [input.otherOwnerId],
  );
  const before = await readOwnedApplicationStatus(input.ownerId, input.applicationId);
  expect(before?.canWithdraw).toBe(true);
  const command = {
    applicationId: input.applicationId,
    correlationId: crypto.randomUUID(),
    idempotencyKey: "withdraw-submission-test",
    reasonCode: "OTHER",
  };
  await expect(withdrawOwnedApplication({
    ...command,
    actorId: input.otherOwnerId,
  })).resolves.toEqual({ kind: "not_found" });
  const first = await withdrawOwnedApplication({
    ...command,
    actorId: input.ownerId,
  });
  expect(first).toMatchObject({ kind: "withdrawn" });
  await expect(withdrawOwnedApplication({
    ...command,
    actorId: input.ownerId,
  })).resolves.toEqual(first);
  await expect(withdrawOwnedApplication({
    ...command,
    actorId: input.ownerId,
    idempotencyKey: "second-withdrawal",
  })).resolves.toEqual({ kind: "unavailable" });

  const persisted = await input.query(
    `SELECT application.status AS application_status,
       workflow.status AS workflow_status,
       (SELECT count(*)::integer FROM app_application_lifecycle_history history
         WHERE history.application_id = application.id
           AND history.target_status = 'withdrawn') AS withdrawal_count,
       (SELECT count(*)::integer FROM app_application_audit_entries audit
         WHERE audit.application_id = application.id
           AND audit.action = 'APPLICATION_WITHDRAWN') AS audit_count,
       (SELECT count(*)::integer FROM app_workflow_tasks task
         JOIN app_workflow_stage_instances stage
           ON stage.id = task.stage_instance_id
         WHERE stage.workflow_instance_id = workflow.id
           AND task.status NOT IN ('COMPLETED', 'CANCELLED')) AS open_tasks
     FROM app_applications application
     JOIN app_workflow_instances workflow
       ON workflow.application_id = application.id
     WHERE application.id = $1`,
    [input.applicationId],
  );
  const after = await readOwnedApplicationStatus(input.ownerId, input.applicationId);
  expect(after?.canWithdraw).toBe(false);
  expect(persisted.rows[0]).toMatchObject({
    application_status: "withdrawn",
    audit_count: 1,
    open_tasks: 0,
    withdrawal_count: 1,
    workflow_status: "CANCELLED",
  });
}
