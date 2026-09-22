import "server-only";

import { sql } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";

export type AppendDocumentEvidenceVersionInput = {
  applicationId: string;
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
    LEFT JOIN app_workflow_document_evidence_versions evidence
      ON evidence.application_id = workflow.application_id
      AND evidence.requirement_id = requirement.id
    WHERE requirement.id = ${input.requirementId}::uuid
    GROUP BY requirement.id
    RETURNING id, version_number AS "versionNumber"
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
