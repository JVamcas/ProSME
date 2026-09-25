ALTER TABLE "app_workflow_stage_checklist_definitions"
  ADD COLUMN "task_definition_id" uuid;
--> statement-breakpoint
UPDATE "app_workflow_stage_checklist_definitions" checklist
SET "task_definition_id" = (
  SELECT task.id
  FROM "app_stage_task_definitions" task
  WHERE task.stage_id = checklist.stage_id
  ORDER BY
    CASE WHEN EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(task.config -> 'items', '[]'::jsonb)) item
      WHERE item ->> 'code' = checklist.key
    ) THEN 0 ELSE 1 END,
    task.sequence,
    task.id
  LIMIT 1
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "app_workflow_stage_checklist_definitions"
    WHERE "task_definition_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Every checklist item must have a workflow task in its stage';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_checklist_definitions"
  ALTER COLUMN "task_definition_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_checklist_definitions"
  ADD CONSTRAINT "app_stage_checklists_task_fk"
  FOREIGN KEY ("task_definition_id")
  REFERENCES "public"."app_stage_task_definitions"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX "app_stage_checklists_task_idx"
  ON "app_workflow_stage_checklist_definitions" USING btree ("task_definition_id");
