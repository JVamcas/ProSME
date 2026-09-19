ALTER TABLE app_workflow_action_definitions
  ADD COLUMN configuration jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions
  ADD CONSTRAINT app_workflow_actions_configuration_object_check
  CHECK (jsonb_typeof(configuration) = 'object');
