ALTER TABLE "app_workflow_action_executions"
  ALTER COLUMN "action_definition_id" DROP NOT NULL,
  ALTER COLUMN "source_stage_instance_id" DROP NOT NULL;
--> statement-breakpoint
UPDATE "app_capabilities"
SET "description" = 'Withdraw a submitted application owned by the signed-in user while processing is active.'
WHERE "code" = 'funding.application.own.withdraw';
