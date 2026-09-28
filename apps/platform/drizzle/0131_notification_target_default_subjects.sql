ALTER TABLE "app_notification_template_targets"
  ADD COLUMN "default_subject_template" text
  DEFAULT 'Notification from {{platformName}}' NOT NULL;
--> statement-breakpoint
UPDATE "app_notification_template_targets"
SET "default_subject_template" = 'Notification from {{platformName}}'
WHERE "scope" = 'GLOBAL';
--> statement-breakpoint
UPDATE "app_notification_template_targets" AS target
SET "default_subject_template" = CASE catalog.catalog_key
  WHEN 'APPLICATIONS' THEN 'Application {{applicationReference}} update'
  WHEN 'WORKFLOW' THEN 'Workflow update for application {{applicationReference}}'
  ELSE target.default_subject_template
END
FROM "app_notification_catalogs" AS catalog
WHERE target.catalog_id = catalog.id
  AND target.scope = 'CATALOG';
--> statement-breakpoint
UPDATE "app_notification_template_targets" AS target
SET "default_subject_template" = CASE event.event_key
  WHEN 'application.submitted'
    THEN 'Application {{applicationReference}} submitted'
  WHEN 'workflow.task.assigned'
    THEN 'New task assigned for application {{applicationReference}}'
  WHEN 'workflow.information-request.created'
    THEN 'Information requested for application {{applicationReference}}'
  WHEN 'workflow.information-request.responded'
    THEN 'Applicant responded for application {{applicationReference}}'
  WHEN 'workflow.information-request.closed'
    THEN 'Information request closed for application {{applicationReference}}'
  WHEN 'workflow.information-request.expired'
    THEN 'Information request expired for application {{applicationReference}}'
  ELSE target.default_subject_template
END
FROM "app_notification_events" AS event
WHERE target.event_id = event.id
  AND target.scope = 'EVENT';
--> statement-breakpoint
ALTER TABLE "app_notification_template_targets"
  ADD CONSTRAINT "app_notification_template_targets_subject_check"
  CHECK (
    char_length(trim("default_subject_template")) BETWEEN 1 AND 500
    AND "default_subject_template" !~ E'[\\r\\n]'
  );
