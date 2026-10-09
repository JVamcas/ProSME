import "server-only";

import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db/client";

export async function copyCallIntegrationBindings(
  transaction: DatabaseTransaction,
  callId: string,
  sourceVersionId: string,
  draftVersionId: string,
  actorId: string,
) {
  await transaction.execute(sql`
    WITH copied AS (
      INSERT INTO app_funding_call_eligibility_integration_bindings
        (funding_call_id, workflow_template_version_id, integration_version_id,
         manual_fallback_allowed, provider_adapter_key, provider_display_name,
         secret_reference, created_by)
      SELECT binding.funding_call_id, binding.workflow_template_version_id,
        binding.integration_version_id, binding.manual_fallback_allowed,
        binding.provider_adapter_key, binding.provider_display_name,
        binding.secret_reference, ${actorId}::uuid
      FROM app_funding_call_eligibility_integration_bindings binding
      JOIN app_funding_call_version_integration_bindings link ON link.binding_id = binding.id
      WHERE link.funding_call_id = ${callId}::uuid
        AND link.funding_call_version_id = ${sourceVersionId}::uuid
      RETURNING id, funding_call_id, integration_version_id
    )
    INSERT INTO app_funding_call_version_integration_bindings
      (binding_id, funding_call_id, funding_call_version_id, integration_version_id)
    SELECT id, funding_call_id, ${draftVersionId}::uuid, integration_version_id FROM copied
  `);
}

export async function publishCallIntegrationBindings(
  transaction: DatabaseTransaction,
  callId: string,
  versionId: string,
  workflowVersionId: string,
) {
  await transaction.execute(sql`
    INSERT INTO app_funding_call_version_integration_bindings
      (binding_id, funding_call_id, funding_call_version_id, integration_version_id)
    SELECT binding.id, binding.funding_call_id, ${versionId}::uuid, binding.integration_version_id
    FROM app_funding_call_eligibility_integration_bindings binding
    WHERE binding.funding_call_id = ${callId}::uuid
      AND binding.workflow_template_version_id = ${workflowVersionId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM app_funding_call_version_integration_bindings link
        WHERE link.binding_id = binding.id
      )
  `);
}
