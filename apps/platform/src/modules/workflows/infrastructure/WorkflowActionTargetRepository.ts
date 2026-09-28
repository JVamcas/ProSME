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
      AND CASE
        WHEN ${target.action.actionType}::text IN ('RETURN', 'REFER') THEN
          EXISTS (
            SELECT 1
            FROM app_workflow_transition_definitions semantic_transition
            WHERE semantic_transition.version_id = ${target.stage.workflowVersionId}::uuid
              AND semantic_transition.from_stage_id = ${target.stage.stageDefinitionId}::uuid
              AND semantic_transition.action_key = ${target.action.stableKey}
          )
          AND NOT EXISTS (
            SELECT 1
            FROM app_workflow_transition_definitions semantic_transition
            WHERE semantic_transition.version_id = ${target.stage.workflowVersionId}::uuid
              AND semantic_transition.from_stage_id = ${target.stage.stageDefinitionId}::uuid
              AND semantic_transition.action_key = ${target.action.stableKey}
              AND (
                semantic_transition.terminal_outcome IS NOT NULL
                OR 1 <> (
                  SELECT count(*)
                  FROM app_workflow_transition_targets semantic_target
                  WHERE semantic_target.transition_id = semantic_transition.id
                )
                OR 1 <> (
                  SELECT count(*)
                  FROM app_workflow_transition_targets semantic_target
                  JOIN app_workflow_stage_definitions semantic_stage
                    ON semantic_stage.id = semantic_target.target_stage_id
                  WHERE semantic_target.transition_id = semantic_transition.id
                    AND semantic_stage.repeatable = TRUE
                )
              )
          )
        ELSE TRUE
      END
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_transition_definitions transition
        WHERE transition.version_id = ${target.stage.workflowVersionId}::uuid
          AND transition.from_stage_id = ${target.stage.stageDefinitionId}::uuid
          AND transition.action_key = ${target.action.stableKey}
          AND (
            (
              NOT EXISTS (
                SELECT 1 FROM app_workflow_transition_targets transition_target
                WHERE transition_target.transition_id = transition.id
              )
            )
              = (transition.terminal_outcome IS NULL)
            OR EXISTS (
              SELECT 1
              FROM app_workflow_transition_targets transition_target
              INNER JOIN app_workflow_stage_definitions target_stage
                ON target_stage.id = transition_target.target_stage_id
              WHERE transition_target.transition_id = transition.id
                AND target_stage.version_id IS DISTINCT FROM
                ${target.stage.workflowVersionId}::uuid
            )
          )
      ) AS valid
  `);
  return (checked.rows[0] as { valid: boolean } | undefined)?.valid ?? false;
}
