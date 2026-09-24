ALTER TABLE "app_workflow_audit_entries"
  ADD COLUMN "workflow_instance_id" uuid,
  ADD COLUMN "stage_instance_id" uuid,
  ADD COLUMN "task_id" uuid,
  ADD COLUMN "reason" text,
  ADD COLUMN "runtime_sequence" bigint GENERATED ALWAYS AS IDENTITY;
--> statement-breakpoint
ALTER TABLE "app_workflow_audit_entries"
  ADD CONSTRAINT "app_workflow_audit_workflow_instance_fk"
  FOREIGN KEY ("workflow_instance_id")
  REFERENCES "public"."app_workflow_instances"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_audit_stage_instance_fk"
  FOREIGN KEY ("stage_instance_id")
  REFERENCES "public"."app_workflow_stage_instances"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_workflow_audit_task_fk"
  FOREIGN KEY ("task_id")
  REFERENCES "public"."app_workflow_tasks"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_workflow_audit_runtime_path_idx"
  ON "app_workflow_audit_entries"
  ("workflow_instance_id", "runtime_sequence");
