ALTER TABLE "app_workflow_instances"
  DROP CONSTRAINT "app_workflow_instances_status_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_instances"
  ADD COLUMN "terminal_outcome" text,
  ADD COLUMN "public_status" jsonb,
  ADD CONSTRAINT "app_workflow_instances_status_check"
    CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED')),
  ADD CONSTRAINT "app_workflow_instances_rejection_check"
    CHECK (
      ("status" = 'REJECTED'
        AND "terminal_outcome" IS NOT NULL
        AND jsonb_typeof("public_status") = 'object'
        AND "public_status" ?& ARRAY['status', 'label', 'description'])
      OR
      ("status" <> 'REJECTED'
        AND "terminal_outcome" IS NULL
        AND "public_status" IS NULL)
    );
--> statement-breakpoint
ALTER TABLE "app_workflow_decisions"
  DROP CONSTRAINT "app_workflow_decisions_outcome_check",
  DROP CONSTRAINT "app_workflow_decisions_input_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_decisions"
  ADD CONSTRAINT "app_workflow_decisions_outcome_check"
    CHECK ("outcome" IN ('APPROVED', 'REJECTED')),
  ADD CONSTRAINT "app_workflow_decisions_input_check"
    CHECK (
      jsonb_typeof("input") = 'object'
      AND (
        ("outcome" = 'APPROVED'
          AND "input"->>'actionType' = 'APPROVE_ADVANCE')
        OR
        ("outcome" = 'REJECTED'
          AND "input"->>'actionType' = 'REJECT')
      )
    );
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_executions"
  DROP CONSTRAINT "app_workflow_transition_executions_outcome_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_transition_executions"
  ADD CONSTRAINT "app_workflow_transition_executions_outcome_check"
    CHECK ("outcome" IN (
      'RECORDED',
      'TARGET_ACTIVATED',
      'TARGET_ENTRY_CONDITION_FAILED',
      'WORKFLOW_COMPLETED',
      'WORKFLOW_REJECTED'
    ));
