ALTER TABLE app_workflow_action_definitions
  DISABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
WITH stage_action_orders AS (
  SELECT stage.id AS stage_id,
    COALESCE(MAX(action.display_order), 0) AS maximum_display_order
  FROM app_workflow_stage_definitions stage
  LEFT JOIN app_workflow_action_definitions action
    ON action.stage_id = stage.id
  GROUP BY stage.id
), stage_escalation_roles AS (
  SELECT stage.id AS stage_id,
    COALESCE(
      (
        SELECT task.assignment_role_id
        FROM app_stage_task_definitions task
        WHERE task.stage_id = stage.id
          AND task.assignment_role_id IS NOT NULL
        ORDER BY task.sequence, task.id
        LIMIT 1
      ),
      (
        SELECT role.id
        FROM app_roles role
        ORDER BY role.code, role.id
        LIMIT 1
      )
    ) AS role_id
  FROM app_workflow_stage_definitions stage
), action_templates AS (
  SELECT *
  FROM (VALUES
    (
      'REQUEST_INFORMATION'::text,
      'Request information'::text,
      'REQUEST_INFORMATION'::text,
      false,
      false,
      1,
      '{
        "continuation": "RESUME_SOURCE_TASK",
        "deadlineDays": 10,
        "editableFieldPaths": ["CLARIFICATION_RESPONSE"],
        "expiryAction": "ESCALATE",
        "participantScope": "APPLICATION_OWNER_AND_REQUESTER",
        "recipientScope": "APPLICATION_OWNER",
        "reminderDayOffsets": [3, 7]
      }'::jsonb
    ),
    (
      'REFER',
      'Refer',
      'REFER',
      false,
      true,
      2,
      '{"returnToReferrer": false}'::jsonb
    ),
    (
      'PUT_ON_HOLD',
      'Put on hold',
      'PUT_ON_HOLD',
      false,
      true,
      3,
      '{"reasonCodes": ["OTHER"], "reviewDateRequired": true}'::jsonb
    ),
    (
      'ESCALATE',
      'Escalate',
      'ESCALATE',
      false,
      false,
      4,
      NULL::jsonb
    )
  ) AS template(
    stable_key,
    label,
    action_type,
    enabled,
    reason_code_required,
    template_order,
    configuration
  )
), missing_actions AS (
  SELECT stage.id AS stage_id,
    template.stable_key,
    template.label,
    template.action_type,
    template.enabled,
    template.reason_code_required,
    template.template_order,
    CASE
      WHEN template.action_type = 'ESCALATE' THEN jsonb_build_object(
        'targetId', escalation.role_id,
        'targetType', 'ROLE',
        'trigger', 'MANUAL'
      )
      ELSE template.configuration
    END AS configuration,
    ROW_NUMBER() OVER (
      PARTITION BY stage.id
      ORDER BY template.template_order
    ) AS missing_order
  FROM app_workflow_stage_definitions stage
  CROSS JOIN action_templates template
  JOIN stage_escalation_roles escalation
    ON escalation.stage_id = stage.id
  WHERE (
      template.action_type <> 'ESCALATE'
      OR escalation.role_id IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM app_workflow_action_definitions existing
      WHERE existing.stage_id = stage.id
        AND existing.stable_key = template.stable_key
    )
)
INSERT INTO app_workflow_action_definitions (
  stage_id,
  stable_key,
  label,
  action_type,
  enabled,
  reason_code_required,
  display_order,
  configuration
)
SELECT missing.stage_id,
  missing.stable_key,
  missing.label,
  missing.action_type,
  missing.enabled,
  missing.reason_code_required,
  orders.maximum_display_order + missing.missing_order,
  missing.configuration
FROM missing_actions missing
JOIN stage_action_orders orders
  ON orders.stage_id = missing.stage_id
ON CONFLICT (stage_id, stable_key) DO NOTHING;
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions
  ENABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
INSERT INTO app_stage_task_action_bindings (
  task_definition_id,
  stage_id,
  action_key
)
SELECT task.id,
  action.stage_id,
  action.stable_key
FROM app_workflow_action_definitions action
JOIN app_stage_task_definitions task
  ON task.stage_id = action.stage_id
WHERE (
  action.stable_key = 'REQUEST_INFORMATION'
  AND action.action_type = 'REQUEST_INFORMATION'
)
OR (
  action.stable_key = 'REFER'
  AND action.action_type = 'REFER'
)
OR (
  action.stable_key = 'ESCALATE'
  AND action.action_type = 'ESCALATE'
)
OR (
  action.stable_key = 'PUT_ON_HOLD'
  AND action.action_type = 'PUT_ON_HOLD'
)
ON CONFLICT (task_definition_id, action_key) DO NOTHING;
