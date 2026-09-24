import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { ApplicationSubmissionSnapshotContent } from "../domain/ApplicationSubmissionSnapshot";
import { applicationAuditEntries } from "./application.schema";

type SnapshotAccessInput = {
  actorId: string;
  allowAll: boolean;
  allowAssigned: boolean;
  allowOwn: boolean;
  applicationId: string;
  correlationId: string;
};

type SnapshotRow = {
  applicationId: string;
  canonicalContent: string;
  integrityHash: string;
  schemaVersion: number;
  snapshotContent: ApplicationSubmissionSnapshotContent;
  submittedAt: Date | string;
};

export async function readSubmissionSnapshotAndAudit(
  input: SnapshotAccessInput,
): Promise<(Omit<SnapshotRow, "submittedAt"> & { submittedAt: Date }) | null> {
  return getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute(sql`
      SELECT snapshot.application_id AS "applicationId",
        snapshot.schema_version AS "schemaVersion",
        snapshot.snapshot_content AS "snapshotContent",
        snapshot.canonical_content AS "canonicalContent",
        snapshot.integrity_hash AS "integrityHash",
        snapshot.submitted_at AS "submittedAt"
      FROM app_application_submission_snapshots snapshot
      JOIN app_applications application
        ON application.id = snapshot.application_id
      WHERE snapshot.application_id = ${input.applicationId}::uuid
        AND (
          ${input.allowAll}
          OR (${input.allowOwn}
            AND application.owner_user_id = ${input.actorId}::uuid)
          OR (${input.allowAssigned} AND EXISTS (
            SELECT 1
            FROM app_workflow_instances workflow
            JOIN app_workflow_stage_instances stage
              ON stage.workflow_instance_id = workflow.id
            JOIN app_workflow_tasks task
              ON task.stage_instance_id = stage.id
            WHERE workflow.application_id = application.id
              AND (
                task.assigned_user_id = ${input.actorId}::uuid
                OR task.assigned_role_id IN (
                  SELECT role_id
                  FROM app_user_roles
                  WHERE user_id = ${input.actorId}::uuid
                )
              )
          ))
        )
      LIMIT 1
      FOR SHARE OF snapshot
    `);
    const snapshot = result.rows[0] as SnapshotRow | undefined;
    if (!snapshot) return null;
    await transaction.insert(applicationAuditEntries).values({
      action: "SUBMISSION_SNAPSHOT_ACCESSED",
      actorUserId: input.actorId,
      applicationId: input.applicationId,
      correlationId: input.correlationId,
      metadata: {
        integrityHash: snapshot.integrityHash,
        schemaVersion: snapshot.schemaVersion,
      },
    });
    return {
      ...snapshot,
      submittedAt: new Date(snapshot.submittedAt),
    };
  });
}
