ALTER TABLE "app_workflow_stage_definitions" DROP CONSTRAINT "app_workflow_stage_definitions_default_role_id_app_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_definitions" DROP COLUMN "default_role_id";