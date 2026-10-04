-- Run the legacy backfill only once, so rerunning never overrides a later
-- administrator choice. Published versions also retain their prior requirements.
-- Drizzle runs these statements in one transaction. Suspend only the action
-- immutability guard for this schema backfill, then restore it before commit.
ALTER TABLE app_workflow_action_definitions
  DISABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'app_workflow_action_definitions'
      AND column_name = 'reason_code_required'
  ) THEN
    UPDATE app_workflow_action_definitions
    SET reason_code_required = reason_code_required
      OR action_type IN ('REJECT', 'PUT_ON_HOLD', 'DEFER', 'ESCALATE')
      OR (action_type = 'RETURN'
        AND COALESCE((configuration ->> 'reasonRequired')::boolean, false));

    UPDATE app_workflow_action_definitions
    SET configuration = CASE
      WHEN action_type = 'RETURN' THEN configuration - 'reasonRequired'
      WHEN action_type = 'PUT_ON_HOLD' THEN configuration - 'reasonCodes'
      ELSE configuration
    END
    WHERE action_type IN ('RETURN', 'PUT_ON_HOLD');

    ALTER TABLE app_workflow_action_definitions
      RENAME COLUMN reason_code_required TO reason_required;
  END IF;
END $$;
--> statement-breakpoint
-- Rename rather than delete historical reason data. Existing comments and
-- normalized audit payloads remain intact, including historical code values.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'app_workflow_action_executions', 'app_workflow_holds',
    'app_workflow_deferrals', 'app_workflow_escalations'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = target_table AND column_name = 'reason_code'
    ) THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN reason_code TO reason', target_table);
    END IF;
  END LOOP;
END $$;
--> statement-breakpoint
-- Presence is enforced against the action's configurable universal flag by
-- the server, rather than by unconditional action-type database constraints.
ALTER TABLE app_workflow_holds
  DROP CONSTRAINT IF EXISTS app_workflow_holds_reason_check;
--> statement-breakpoint
ALTER TABLE app_workflow_deferrals
  DROP CONSTRAINT IF EXISTS app_workflow_deferrals_reason_check;
--> statement-breakpoint
ALTER TABLE app_workflow_escalations
  DROP CONSTRAINT IF EXISTS app_workflow_escalations_reason_check;
--> statement-breakpoint
ALTER TABLE app_workflow_reworks
  DROP CONSTRAINT IF EXISTS app_workflow_reworks_reason_check;
--> statement-breakpoint
ALTER TABLE app_workflow_reworks ALTER COLUMN reason DROP NOT NULL;
--> statement-breakpoint
-- Terminal rejection always closes outstanding work, including versions whose
-- earlier configuration allowed either cancellation option to be disabled.
UPDATE app_workflow_action_definitions
SET configuration = jsonb_set(
  jsonb_set(configuration, '{outcome,cancelOpenTasks}', 'true'::jsonb),
  '{outcome,cancelOpenStageInstances}', 'true'::jsonb
)
WHERE action_type = 'REJECT'
  AND configuration #>> '{outcome,type}' = 'TERMINAL';
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions
  ENABLE TRIGGER app_workflow_actions_immutable;
