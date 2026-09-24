CREATE TABLE "app_workflow_stage_checklist_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" uuid NOT NULL,
  "key" text NOT NULL,
  "text" text NOT NULL,
  "mandatory" boolean DEFAULT false NOT NULL,
  "response_type" text NOT NULL,
  "evidence_requirement" text NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "display_order" integer NOT NULL,
  CONSTRAINT "app_stage_checklists_response_type_check"
    CHECK ("response_type" IN ('YES_NO', 'TEXT', 'NUMBER', 'DATE')),
  CONSTRAINT "app_stage_checklists_evidence_requirement_check"
    CHECK ("evidence_requirement" IN ('NONE', 'OPTIONAL', 'REQUIRED')),
  CONSTRAINT "app_stage_checklists_display_order_check"
    CHECK ("display_order" > 0)
);
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_checklist_definitions"
  ADD CONSTRAINT "app_stage_checklists_stage_fk"
  FOREIGN KEY ("stage_id")
  REFERENCES "public"."app_workflow_stage_definitions"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_checklists_stage_key_unique"
  ON "app_workflow_stage_checklist_definitions" USING btree ("stage_id", "key");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_checklists_stage_order_unique"
  ON "app_workflow_stage_checklist_definitions" USING btree ("stage_id", "display_order");
