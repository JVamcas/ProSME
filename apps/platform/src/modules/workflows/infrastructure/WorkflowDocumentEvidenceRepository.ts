import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase, type DatabaseTransaction } from "@/db/client";

export type AppendDocumentEvidenceVersionInput = {
  applicationId: string;
  taskId: string;
  contentType: string;
  objectKey: string;
  originalName: string;
  requirementId: string;
  sizeBytes: number;
  uploadedBy: string;
  validUntil: Date | null;
};

export type RecordDocumentVerificationInput = {
  comment: string;
  documentVersionId: string;
  reviewedBy: string;
  status: "REJECTED" | "VERIFIED";
};

export async function appendDocumentEvidenceVersion(
  transaction: DatabaseTransaction,
  input: AppendDocumentEvidenceVersionInput,
) {
  const lockIdentity = `${input.applicationId}:${input.requirementId}`;
  await transaction.execute(sql`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockIdentity}, 0))
  `);
  const result = await transaction.execute<{
    id: string;
    versionNumber: number;
  }>(sql`
    INSERT INTO app_workflow_document_evidence_versions (
      application_id, requirement_id, version_number, object_key,
      original_name, content_type, size_bytes, valid_until, uploaded_by
    )
    SELECT ${input.applicationId}::uuid, ${input.requirementId}::uuid,
      COALESCE(MAX(evidence.version_number), 0) + 1, ${input.objectKey},
      ${input.originalName}, ${input.contentType}, ${input.sizeBytes},
      ${input.validUntil}, ${input.uploadedBy}::uuid
    FROM app_workflow_stage_document_requirements requirement
    JOIN app_workflow_stage_definitions stage
      ON stage.id = requirement.stage_id
    JOIN app_workflow_instances workflow
      ON workflow.application_id = ${input.applicationId}::uuid
      AND workflow.workflow_template_version_id = stage.version_id
    JOIN app_workflow_tasks task ON task.id = ${input.taskId}::uuid
      AND task.workflow_task_definition_id = requirement.task_definition_id
    JOIN app_workflow_stage_instances task_stage
      ON task_stage.id = task.stage_instance_id
      AND task_stage.workflow_instance_id = workflow.id
    LEFT JOIN app_workflow_document_evidence_versions evidence
      ON evidence.application_id = workflow.application_id
      AND evidence.requirement_id = requirement.id
    WHERE requirement.id = ${input.requirementId}::uuid
    GROUP BY requirement.id
    RETURNING id, version_number AS "versionNumber"
  `);
  const version = result.rows[0];
  if (!version) return null;
  await transaction.execute(sql`
    INSERT INTO app_workflow_task_document_evidence (task_id, document_version_id)
    VALUES (${input.taskId}::uuid, ${version.id}::uuid)
  `);
  return version;
}

export async function createDocumentEvidenceVersion(
  input: AppendDocumentEvidenceVersionInput,
) {
  return getDatabase().transaction(
    (transaction) => appendDocumentEvidenceVersion(transaction, input),
  );
}

export async function findDocumentEvidenceVersion(
  applicationId: string,
  versionId: string,
) {
  const result = await getDatabase().execute<{
    contentType: string;
    objectKey: string;
    originalName: string;
    requirementId: string;
  }>(sql`
    SELECT content_type AS "contentType", object_key AS "objectKey",
      original_name AS "originalName", requirement_id AS "requirementId"
    FROM app_workflow_document_evidence_versions
    WHERE application_id = ${applicationId}::uuid
      AND id = ${versionId}::uuid
    LIMIT 1
  `);
  return result.rows[0] ?? null;
}

export async function recordDocumentEvidenceVerification(
  transaction: DatabaseTransaction,
  input: RecordDocumentVerificationInput,
) {
  const result = await transaction.execute<{ id: string }>(sql`
    INSERT INTO app_workflow_document_evidence_verifications (
      document_version_id, status, reviewed_by, comment
    )
    SELECT evidence.id, ${input.status}, ${input.reviewedBy}::uuid,
      ${input.comment}
    FROM app_workflow_document_evidence_versions evidence
    WHERE evidence.id = ${input.documentVersionId}::uuid
    RETURNING id
  `);
  return result.rows[0] ?? null;
}
