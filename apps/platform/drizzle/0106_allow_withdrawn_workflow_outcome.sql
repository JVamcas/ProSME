ALTER TABLE app_workflow_instances
  DROP CONSTRAINT app_workflow_instances_rejection_check;
--> statement-breakpoint
ALTER TABLE app_workflow_instances
  ADD CONSTRAINT app_workflow_instances_rejection_check
  CHECK (
    (status = 'REJECTED'
      AND terminal_outcome IS NOT NULL
      AND jsonb_typeof(public_status) = 'object'
      AND public_status ?& ARRAY['status', 'label', 'description'])
    OR
    (status = 'CANCELLED'
      AND terminal_outcome = 'WITHDRAWN'
      AND public_status IS NOT NULL
      AND jsonb_typeof(public_status) = 'object'
      AND public_status ?& ARRAY['status', 'label', 'description']
      AND public_status ->> 'status' = 'WITHDRAWN')
    OR
    (status <> 'REJECTED'
      AND terminal_outcome IS NULL
      AND public_status IS NULL)
  );
