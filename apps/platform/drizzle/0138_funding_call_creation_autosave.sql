CREATE TABLE "app_funding_call_creation_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "current_step" text DEFAULT 'basics' NOT NULL,
  "values" jsonb NOT NULL,
  "row_version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_funding_call_creation_progress_owner_fk"
    FOREIGN KEY ("owner_id") REFERENCES "public"."app_users"("id")
    ON DELETE cascade,
  CONSTRAINT "app_funding_call_creation_progress_step_check"
    CHECK ("current_step" IN (
      'basics',
      'funding',
      'schedule',
      'application',
      'eligibility',
      'workflow',
      'publicContent',
      'review'
    )),
  CONSTRAINT "app_funding_call_creation_progress_row_version_check"
    CHECK ("row_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_call_creation_progress_owner_unique"
  ON "app_funding_call_creation_progress" USING btree ("owner_id");
