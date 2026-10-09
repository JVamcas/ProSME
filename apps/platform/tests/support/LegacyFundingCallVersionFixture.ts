import { randomUUID } from "node:crypto";
import type pg from "pg";
import type { FundingCall } from "@/modules/funding-calls/domain/FundingCall";
import { captureFundingCallPublication } from "@/modules/funding-calls/domain/FundingCallPublication";
import {
  seedVersionCall,
  versionActorId,
  versionOwnerId,
} from "./FundingCallVersionDatabaseFixture";

export const legacyApplicationId = randomUUID();
export const legacySubmittedId = randomUUID();
export const legacyUnmatchedId = randomUUID();
export const legacyPublicationId = randomUUID();
export let legacyCallId: string;

export async function seedLegacyCallAmendment(pool: pg.Pool) {
  const binding = await seedVersionCall(pool);
  legacyCallId = binding.callId;
  const rows = await pool.query(
    "SELECT * FROM app_funding_calls WHERE id = $1",
    [legacyCallId],
  );
  const call = Object.fromEntries(
    Object.entries(rows.rows[0]).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  ) as FundingCall;
  const historyId = randomUUID();
  await pool.query(
    `INSERT INTO app_funding_call_lifecycle_history
    (id, funding_call_id, command, source_status, target_status, command_time,
      effective_time, actor_id, idempotency_key, correlation_id, row_version)
    VALUES ($1::uuid, $2, 'PUBLISH', 'APPROVED', 'LIVE', '2025-01-01', '2025-01-01',
      $3, $1::text, $1::uuid, 2)`,
    [historyId, legacyCallId, versionActorId],
  );
  await pool.query(
    `INSERT INTO app_funding_call_publication_revisions
    (id, funding_call_id, revision_number, source_row_version, published_status,
      snapshot, lifecycle_history_id, published_by, published_at, correlation_id)
    VALUES ($1, $2, 1, 1, 'LIVE', $3, $4, $5, '2025-01-01', $4)`,
    [
      legacyPublicationId,
      legacyCallId,
      captureFundingCallPublication(call, []),
      historyId,
      versionActorId,
    ],
  );
  await pool.query(
    `INSERT INTO app_applications
    (id, owner_user_id, funding_opportunity_id, funding_opportunity_title,
      form_version_id, eligibility_rule_set_version_id, duplicate_policy, created_at)
    VALUES
      ($1, $2, $3, 'Original version', $4, $5, 'none', '2025-02-01'),
      ($6, $2, $3, 'Original version', $4, $5, 'none', '2024-02-01')`,
    [
      legacyApplicationId,
      versionOwnerId,
      legacyCallId,
      binding.formVersionId,
      binding.rulesVersionId,
      legacyUnmatchedId,
    ],
  );
  await pool.query(
    `INSERT INTO app_applications
    (id, owner_user_id, funding_opportunity_id, funding_opportunity_title,
      form_version_id, eligibility_rule_set_version_id, duplicate_policy,
      status, submitted_at, reference, created_at)
    VALUES ($1, $2, $3, 'Original version', $4, $5, 'none', 'submitted',
      '2025-03-01', 'SYNTHETIC-SUBMITTED', '2025-02-01')`,
    [
      legacySubmittedId,
      versionOwnerId,
      legacyCallId,
      binding.formVersionId,
      binding.rulesVersionId,
    ],
  );
  await pool.query(
    `INSERT INTO app_application_submission_snapshots
    (application_id, application_row_version, response_row_version, form_version_id,
      eligibility_rule_set_version_id, workflow_template_version_id, schema_version,
      snapshot_content, canonical_content, integrity_hash, application_data, business_data,
      declaration_acceptance, document_versions, normalized_form_values, submitted_at)
    VALUES ($1, 1, 1, $2, $3, $4, 1, $5::jsonb, $5::jsonb::text, repeat('0', 64), '{}', '{}', '{}', '[]', '{}', '2025-03-01')`,
    [
      legacySubmittedId,
      binding.formVersionId,
      binding.rulesVersionId,
      binding.workflowVersionId,
      { fundingCall: { publicationRevisionId: legacyPublicationId } },
    ],
  );
  await pool.query(
    `UPDATE app_funding_calls SET status = 'APPROVAL_PENDING',
    title = 'Unpublished legacy amendment', opens_at = '2050-01-01', row_version = 3
    WHERE id = $1`,
    [legacyCallId],
  );
  await pool.query(
    `INSERT INTO app_funding_call_governance_reviews
    (funding_call_id, submitted_by, submitted_at, submitted_row_version,
      creator_id, material_editor_id, configuration_snapshot)
    VALUES ($1, $2, now(), 3, $2, $2, '{}')`,
    [legacyCallId, versionActorId],
  );
}
