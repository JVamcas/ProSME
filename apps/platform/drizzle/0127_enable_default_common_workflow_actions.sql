ALTER TABLE app_workflow_action_definitions
  DISABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
UPDATE app_workflow_action_definitions
SET enabled = true
WHERE (stable_key, action_type) IN (
  ('REQUEST_INFORMATION', 'REQUEST_INFORMATION'),
  ('REFER', 'REFER'),
  ('PUT_ON_HOLD', 'PUT_ON_HOLD'),
  ('ESCALATE', 'ESCALATE')
)
AND enabled = false;
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions
  ENABLE TRIGGER app_workflow_actions_immutable;
