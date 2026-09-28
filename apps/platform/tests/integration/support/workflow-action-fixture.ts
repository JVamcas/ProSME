type Query = (text: string, values?: unknown[]) => Promise<unknown>;

export function configureWorkflowAction(
  query: Query,
  input: {
    nextStageDefinitionId: string;
    stageDefinitionId: string;
    taskDefinitionId: string;
    versionId: string;
  },
) {
  return query(
    `WITH configured_action AS (
      INSERT INTO app_workflow_action_definitions (stage_id, stable_key, label,
        action_type, display_order, configuration)
      VALUES ($1, 'ADVANCE', 'Advance', 'APPROVE_ADVANCE', 1, '{}'::jsonb)
      RETURNING stage_id
    ), configured_transition AS (
      INSERT INTO app_workflow_transition_definitions
        (version_id, from_stage_id, action_key, priority)
      SELECT $2, stage_id, 'ADVANCE', 1 FROM configured_action
      RETURNING id, from_stage_id, action_key
    ), configured_target AS (
      INSERT INTO app_workflow_transition_targets
        (transition_id, target_stage_id)
      SELECT id, $3 FROM configured_transition
      RETURNING transition_id
    ) INSERT INTO app_stage_task_action_bindings
      (task_definition_id, stage_id, action_key)
    SELECT $4, from_stage_id, action_key
    FROM configured_transition
    WHERE EXISTS (SELECT 1 FROM configured_target)`,
    [
      input.stageDefinitionId,
      input.versionId,
      input.nextStageDefinitionId,
      input.taskDefinitionId,
    ],
  );
}
