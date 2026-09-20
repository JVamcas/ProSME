CREATE TABLE "app_workflow_stage_scoring_configurations" (
  "stage_id" uuid PRIMARY KEY NOT NULL,
  "aggregation" text NOT NULL,
  CONSTRAINT "app_stage_scoring_aggregation_check"
    CHECK (
      "aggregation" IN (
        'WEIGHTED_AVERAGE',
        'WEIGHTED_SUM',
        'AVERAGE',
        'SUM'
      )
    )
);
--> statement-breakpoint
CREATE TABLE "app_workflow_stage_scoring_criteria" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stage_id" uuid NOT NULL,
  "criterion" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "weight" double precision NOT NULL,
  "scale_minimum" double precision NOT NULL,
  "scale_maximum" double precision NOT NULL,
  "threshold" double precision NOT NULL,
  "mandatory_comment" boolean DEFAULT false NOT NULL,
  CONSTRAINT "app_stage_scoring_weight_check"
    CHECK ("weight" > 0 AND "weight" <= 100),
  CONSTRAINT "app_stage_scoring_scale_check"
    CHECK (
      "scale_minimum" >= 0
      AND "scale_maximum" > "scale_minimum"
      AND "scale_maximum" <= 1000
    ),
  CONSTRAINT "app_stage_scoring_threshold_check"
    CHECK (
      "threshold" >= "scale_minimum"
      AND "threshold" <= "scale_maximum"
    )
);
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_scoring_configurations"
  ADD CONSTRAINT "app_stage_scoring_configuration_stage_fk"
  FOREIGN KEY ("stage_id")
  REFERENCES "public"."app_workflow_stage_definitions"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "app_workflow_stage_scoring_criteria"
  ADD CONSTRAINT "app_stage_scoring_criterion_configuration_fk"
  FOREIGN KEY ("stage_id")
  REFERENCES "public"."app_workflow_stage_scoring_configurations"("stage_id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_stage_scoring_criteria_name_unique"
  ON "app_workflow_stage_scoring_criteria" USING btree (
    "stage_id",
    "criterion"
  );
--> statement-breakpoint
CREATE INDEX "app_stage_scoring_criteria_stage_idx"
  ON "app_workflow_stage_scoring_criteria" USING btree ("stage_id");
