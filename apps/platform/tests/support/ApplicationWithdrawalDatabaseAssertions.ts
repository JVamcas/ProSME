import { expect } from "vitest";

import { withdrawOwnedApplication } from "@/modules/applications/infrastructure/ApplicationWithdrawalRepository";

type Query = (text: string, values?: unknown[]) => Promise<{
  rows: Record<string, unknown>[];
}>;

export async function assertApplicationWithdrawal(input: {
  applicationId: string;
  ownerId: string;
  otherOwnerId: string;
  query: Query;
  stageDefinitionId: string;
}) {
  await input.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'withdrawal-other@example.test', 'Other Applicant', 'applicant', 'active')`,
    [input.otherOwnerId],
  );
  await input.query(
    `INSERT INTO app_workflow_action_definitions
      (stage_id, stable_key, label, action_type, enabled,
       reason_code_required, display_order, configuration)
     VALUES ($1, 'APPLICANT_WITHDRAW', 'Withdraw application',
       'WITHDRAW', true, false, 1,
       '{"allowedStageKeys":["INITIAL"],"resubmissionRule":"NOT_ALLOWED"}'::jsonb)`,
    [input.stageDefinitionId],
  );
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
  expect(persisted.rows[0]).toMatchObject({
    application_status: "withdrawn",
    audit_count: 1,
    open_tasks: 0,
    withdrawal_count: 1,
    workflow_status: "CANCELLED",
  });
}
