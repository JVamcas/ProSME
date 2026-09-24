ALTER TABLE app_workflow_transition_definitions
  DROP CONSTRAINT app_workflow_transitions_action_check;
--> statement-breakpoint
DROP INDEX app_workflow_transitions_source_action_unique;
--> statement-breakpoint
ALTER TABLE app_workflow_transition_definitions
  RENAME COLUMN action_code TO action_key;
--> statement-breakpoint
ALTER TABLE app_workflow_transition_definitions
  DROP COLUMN required_capability,
  DROP COLUMN condition,
  ADD COLUMN priority integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE app_workflow_transition_definitions
  ALTER COLUMN priority DROP DEFAULT,
  ADD CONSTRAINT app_workflow_transitions_action_key_check
    CHECK (action_key ~ '^[A-Z][A-Z0-9_]*$'),
  ADD CONSTRAINT app_workflow_transitions_priority_check
    CHECK (priority > 0);
--> statement-breakpoint
CREATE UNIQUE INDEX app_workflow_transitions_source_action_priority_unique
  ON app_workflow_transition_definitions
  (version_id, from_stage_id, action_key, priority);
--> statement-breakpoint
ALTER TABLE app_workflow_transition_definitions
  ADD CONSTRAINT app_workflow_transitions_source_action_fk
  FOREIGN KEY (from_stage_id, action_key)
  REFERENCES app_workflow_action_definitions (stage_id, stable_key)
  ON DELETE RESTRICT;
