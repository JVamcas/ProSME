type Query = (text: string, values?: unknown[]) => Promise<unknown>;

export function configureWorkflowAction(
  query: Query,
  input: {
    nextStageDefinitionId: string;
    stageDefinitionId: string;
    versionId: string;
  },
) {
  return query(
    `WITH configured_action AS (
      INSERT INTO app_workflow_action_definitions (stage_id, stable_key, label,
        action_type, display_order, configuration)
      VALUES ($1, 'ADVANCE', 'Advance', 'APPROVE_ADVANCE', 1, '{}'::jsonb)
      RETURNING stage_id
    ) INSERT INTO app_workflow_transition_definitions
      (version_id, from_stage_id, action_key, to_stage_id, priority)
    SELECT $2, stage_id, 'ADVANCE', $3, 1 FROM configured_action`,
    [
      input.stageDefinitionId,
      input.versionId,
      input.nextStageDefinitionId,
    ],
  );
}
