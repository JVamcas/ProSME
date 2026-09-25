ALTER TABLE "app_workflow_stage_document_requirements"
  ADD COLUMN "task_definition_id" uuid;
--> statement-breakpoint
UPDATE "app_workflow_stage_document_requirements" document
SET "task_definition_id" = (
  SELECT task.id
  FROM "app_stage_task_definitions" task
  WHERE task.stage_id = document.stage_id
  ORDER BY task.sequence, task.id
  LIMIT 1
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "app_workflow_stage_document_requirements"
    WHERE "task_definition_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Every document requirement must have a workflow task in its stage';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_document_requirements"
  ALTER COLUMN "task_definition_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_document_requirements"
  ADD CONSTRAINT "app_stage_documents_task_fk"
  FOREIGN KEY ("task_definition_id")
  REFERENCES "public"."app_stage_task_definitions"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX "app_stage_documents_task_idx"
  ON "app_workflow_stage_document_requirements" USING btree ("task_definition_id");
