ALTER TABLE app_workflow_action_definitions
  ADD COLUMN IF NOT EXISTS notifications jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
INSERT INTO app_notification_events (
  catalog_id, event_key, display_name, description, rule_eligibility
)
SELECT id, 'workflow.action.notification', 'Workflow action notification',
  'Conditional messages configured on a versioned workflow action.', 'SYSTEM_ONLY'
FROM app_notification_catalogs WHERE catalog_key = 'WORKFLOW'
ON CONFLICT (event_key) DO NOTHING;
