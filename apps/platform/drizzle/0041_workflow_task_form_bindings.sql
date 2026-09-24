CREATE TABLE "app_stage_task_form_bindings" (
  "task_definition_id" uuid PRIMARY KEY NOT NULL,
  "form_version_id" uuid NOT NULL,
  CONSTRAINT "app_task_form_bindings_task_fk"
    FOREIGN KEY ("task_definition_id")
    REFERENCES "public"."app_stage_task_definitions"("id")
    ON DELETE RESTRICT,
  CONSTRAINT "app_task_form_bindings_form_version_fk"
    FOREIGN KEY ("form_version_id")
    REFERENCES "public"."app_form_versions"("id")
    ON DELETE RESTRICT
);
--> statement-breakpoint

CREATE INDEX "app_task_form_bindings_form_version_idx"
  ON "app_stage_task_form_bindings" USING btree ("form_version_id");
--> statement-breakpoint

INSERT INTO "app_stage_task_form_bindings"
  ("task_definition_id", "form_version_id")
SELECT "id", "form_version_id"
FROM "app_stage_task_definitions"
WHERE "form_version_id" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "app_stage_task_definitions"
  DROP COLUMN "form_version_id";
