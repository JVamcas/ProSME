UPDATE app_workflow_action_definitions AS action
SET configuration = action.configuration || jsonb_build_object(
  'commentRequired', true,
  'outcome', CASE
    WHEN EXISTS (
      SELECT 1
      FROM app_workflow_stage_definitions AS stage
      INNER JOIN app_workflow_transition_definitions AS transition
        ON transition.version_id = stage.version_id
        AND transition.from_stage_id = action.stage_id
        AND transition.action_key = action.stable_key
      WHERE stage.id = action.stage_id
        AND transition.terminal_outcome IS NOT NULL
    ) THEN jsonb_build_object(
      'cancelOpenStageInstances', true,
      'cancelOpenTasks', true,
      'publicStatusMapping', jsonb_build_object(
        'description', 'A decision is available for your application.',
        'label', 'Decision available',
        'status', 'OUTCOME_AVAILABLE'
      ),
      'type', 'TERMINAL'
    )
    ELSE jsonb_build_object('type', 'TRANSITION')
  END,
  'reversibleActionKey', NULL
)
WHERE action.action_type = 'REJECT'
  AND NOT action.configuration ?& ARRAY[
    'commentRequired',
    'outcome',
    'reversibleActionKey'
  ];
