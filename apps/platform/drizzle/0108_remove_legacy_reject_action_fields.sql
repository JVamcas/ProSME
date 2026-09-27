ALTER TABLE app_workflow_action_definitions
  DISABLE TRIGGER app_workflow_actions_immutable;

UPDATE app_workflow_action_definitions
SET configuration = configuration - ARRAY[
  'commentRequired',
  'reasonCodes'
]
WHERE action_type = 'REJECT'
  AND configuration ?| ARRAY[
    'commentRequired',
    'reasonCodes'
  ];

ALTER TABLE app_workflow_action_definitions
  ENABLE TRIGGER app_workflow_actions_immutable;
