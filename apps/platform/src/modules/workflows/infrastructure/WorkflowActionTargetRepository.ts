import "server-only";

import { sql } from "drizzle-orm";

import type { WorkflowActionDefinition } from "../domain/actions/WorkflowActionDefinition";
import type { StageCompletionTransaction } from "./StageCompletionRepository";

export async function configuredActionTargetsAreValid(
  transaction: Pick<StageCompletionTransaction, "execute">,
  target: {
    action: WorkflowActionDefinition;
    stage: {
      stageDefinitionId: string;
      workflowVersionId: string;
    };
  },
) {
  const configuration = JSON.stringify(target.action.configuration);
  const checked = await transaction.execute(sql`
    SELECT
      CASE ${target.action.actionType}::text
        WHEN 'ESCALATE' THEN CASE ${configuration}::jsonb->>'targetType'
          WHEN 'ROLE' THEN EXISTS (
            SELECT 1 FROM app_roles
            WHERE id = (${configuration}::jsonb->>'targetId')::uuid
          )
          WHEN 'USER' THEN EXISTS (
            SELECT 1 FROM app_users
            WHERE id = (${configuration}::jsonb->>'targetId')::uuid
              AND status = 'active'
          )
          ELSE FALSE
        END
        WHEN 'WITHDRAW' THEN NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            ${configuration}::jsonb->'allowedStageKeys'
          ) configured(stage_key)
          WHERE NOT EXISTS (
            SELECT 1 FROM app_workflow_stage_definitions stage_definition
            WHERE stage_definition.version_id = ${target.stage.workflowVersionId}::uuid
              AND stage_definition.code = configured.stage_key
          )
        )
        WHEN 'DEFER' THEN CASE
          WHEN ${configuration}::jsonb->>'targetType' = 'FUNDING_CALL'
            THEN EXISTS (
              SELECT 1 FROM app_funding_calls funding_call
              WHERE funding_call.reference =
                ${configuration}::jsonb->>'targetCallKey'
            )
          WHEN ${configuration}::jsonb->>'targetType' = 'DATE'
            THEN TRUE
          ELSE FALSE
        END
        ELSE TRUE
      END
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_transition_definitions transition
        LEFT JOIN app_workflow_stage_definitions target_stage
          ON target_stage.id = transition.to_stage_id
        WHERE transition.version_id = ${target.stage.workflowVersionId}::uuid
          AND transition.from_stage_id = ${target.stage.stageDefinitionId}::uuid
          AND transition.action_key = ${target.action.stableKey}
          AND (
            (transition.to_stage_id IS NULL)
              = (transition.terminal_outcome IS NULL)
            OR (
              transition.to_stage_id IS NOT NULL
              AND target_stage.version_id IS DISTINCT FROM
                ${target.stage.workflowVersionId}::uuid
            )
          )
      ) AS valid
  `);
  return (checked.rows[0] as { valid: boolean } | undefined)?.valid ?? false;
}
