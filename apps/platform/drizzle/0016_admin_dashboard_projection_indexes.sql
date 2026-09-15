CREATE INDEX "app_applications_status_submitted_idx"
  ON "app_applications" ("status", "submitted_at", "id");
--> statement-breakpoint
CREATE INDEX "app_workflow_events_created_idx"
  ON "app_workflow_events" ("created_at", "id");
