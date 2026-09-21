ALTER TABLE "app_workflow_stage_instances"
  RENAME COLUMN "stage_definition_id" TO "workflow_stage_definition_id";
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_instances"
  RENAME COLUMN "started_at" TO "activated_at";
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_instances"
  RENAME COLUMN "ended_at" TO "completed_at";
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_instances"
  ADD COLUMN "iteration_number" integer DEFAULT 1 NOT NULL,
  ADD COLUMN "referral_context" jsonb,
  ADD COLUMN "return_context" jsonb,
  ADD CONSTRAINT "app_workflow_stage_instances_iteration_check"
    CHECK ("iteration_number" > 0);
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_instances"
  RENAME CONSTRAINT "app_workflow_stage_instances_definition_fk"
  TO "app_workflow_stage_instances_workflow_stage_definition_fk";
--> statement-breakpoint
DROP INDEX "app_workflow_stage_instances_definition_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_stage_instances_iteration_unique"
  ON "app_workflow_stage_instances" (
    "workflow_instance_id",
    "workflow_stage_definition_id",
    "iteration_number"
  );
--> statement-breakpoint
CREATE INDEX "app_workflow_stage_instances_workflow_status_idx"
  ON "app_workflow_stage_instances" ("workflow_instance_id", "status");
--> statement-breakpoint
ALTER TABLE "app_stage_task_instances" RENAME TO "app_workflow_tasks";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME COLUMN "task_definition_id" TO "workflow_task_definition_id";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME COLUMN "assignment_role_id" TO "assigned_role_id";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME COLUMN "assignment_user_id" TO "assigned_user_id";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME COLUMN "ended_at" TO "completed_at";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  DROP CONSTRAINT "app_stage_task_instances_assignment_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME CONSTRAINT "app_stage_task_instances_status_check"
  TO "app_workflow_tasks_status_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME CONSTRAINT "app_stage_task_instances_row_version_check"
  TO "app_workflow_tasks_row_version_check";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME CONSTRAINT "app_stage_task_instances_stage_fk"
  TO "app_workflow_tasks_stage_fk";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME CONSTRAINT "app_stage_task_instances_definition_fk"
  TO "app_workflow_tasks_workflow_task_definition_fk";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME CONSTRAINT "app_stage_task_instances_role_fk"
  TO "app_workflow_tasks_assigned_role_fk";
--> statement-breakpoint
ALTER TABLE "app_workflow_tasks"
  RENAME CONSTRAINT "app_stage_task_instances_user_fk"
  TO "app_workflow_tasks_assigned_user_fk";
--> statement-breakpoint
ALTER INDEX "app_stage_task_instances_definition_unique"
  RENAME TO "app_workflow_tasks_definition_unique";
--> statement-breakpoint
ALTER INDEX "app_stage_task_instances_assignment_idx"
  RENAME TO "app_workflow_tasks_assignment_idx";
--> statement-breakpoint
ALTER INDEX "app_stage_task_instances_queue_due_idx"
  RENAME TO "app_workflow_tasks_queue_due_idx";
--> statement-breakpoint
ALTER INDEX "app_stage_task_instances_user_queue_idx"
  RENAME TO "app_workflow_tasks_user_queue_idx";
