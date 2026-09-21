ALTER TABLE "app_workflow_instances"
  RENAME COLUMN "workflow_version_id" TO "workflow_template_version_id";
--> statement-breakpoint
ALTER TABLE "app_workflow_instances"
  RENAME CONSTRAINT "app_workflow_instances_version_fk"
  TO "app_workflow_instances_template_version_fk";
--> statement-breakpoint
ALTER TABLE "app_workflow_instances"
  RENAME COLUMN "ended_at" TO "completed_at";
--> statement-breakpoint
ALTER TABLE "app_workflow_instances"
  ADD COLUMN "created_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "app_workflow_instances"
SET "created_at" = "started_at";
--> statement-breakpoint
ALTER TABLE "app_workflow_instances"
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
DROP INDEX "app_workflow_instances_version_idx";
--> statement-breakpoint
CREATE INDEX "app_workflow_instances_template_version_idx"
  ON "app_workflow_instances" ("workflow_template_version_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION workflow_version_has_instances(target_version_id uuid)
RETURNS boolean AS $$
DECLARE has_instances boolean;
BEGIN
  IF to_regclass('public.app_workflow_instances') IS NULL THEN
    RETURN false;
  END IF;
  EXECUTE
    'SELECT EXISTS (
       SELECT 1 FROM app_workflow_instances
       WHERE workflow_template_version_id = $1
     )'
    INTO has_instances
    USING target_version_id;
  RETURN has_instances;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_workflow_instance_repinning()
RETURNS trigger AS $$
BEGIN
  IF NEW."application_id" IS DISTINCT FROM OLD."application_id"
    OR NEW."workflow_template_version_id" IS DISTINCT FROM OLD."workflow_template_version_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
    OR NEW."started_at" IS DISTINCT FROM OLD."started_at"
  THEN
    RAISE EXCEPTION 'workflow instance version pin is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
