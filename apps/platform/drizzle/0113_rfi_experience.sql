CREATE TABLE "app_workflow_rfi_drafts" (
  "rfi_id" uuid PRIMARY KEY NOT NULL,
  "respondent_user_id" uuid NOT NULL,
  "field_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "row_version" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_rfi_drafts_values_check"
    CHECK (jsonb_typeof("field_values") = 'object'),
  CONSTRAINT "app_workflow_rfi_drafts_row_version_check"
    CHECK ("row_version" > 0),
  CONSTRAINT "app_workflow_rfi_drafts_rfi_fk" FOREIGN KEY ("rfi_id")
    REFERENCES "public"."app_workflow_rfis"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfi_drafts_respondent_fk"
    FOREIGN KEY ("respondent_user_id")
    REFERENCES "public"."app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE "app_workflow_rfi_correspondence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "rfi_id" uuid NOT NULL,
  "author_user_id" uuid NOT NULL,
  "author_type" text NOT NULL,
  "entry_type" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_rfi_correspondence_author_check"
    CHECK ("author_type" IN ('APPLICANT', 'STAFF')),
  CONSTRAINT "app_workflow_rfi_correspondence_entry_check"
    CHECK ("entry_type" IN ('REQUEST', 'FOLLOW_UP', 'RESPONSE')),
  CONSTRAINT "app_workflow_rfi_correspondence_message_check"
    CHECK (length(trim("message")) > 0),
  CONSTRAINT "app_workflow_rfi_correspondence_rfi_fk" FOREIGN KEY ("rfi_id")
    REFERENCES "public"."app_workflow_rfis"("id") ON DELETE restrict,
  CONSTRAINT "app_workflow_rfi_correspondence_author_fk"
    FOREIGN KEY ("author_user_id")
    REFERENCES "public"."app_users"("id") ON DELETE restrict
);
CREATE INDEX "app_workflow_rfi_correspondence_history_idx"
  ON "app_workflow_rfi_correspondence" ("rfi_id", "created_at", "id");
--> statement-breakpoint
CREATE FUNCTION app_prevent_workflow_rfi_correspondence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'RFI correspondence is immutable';
END;
$$;
CREATE TRIGGER app_workflow_rfi_correspondence_immutable
BEFORE UPDATE OR DELETE ON "app_workflow_rfi_correspondence"
FOR EACH ROW EXECUTE FUNCTION app_prevent_workflow_rfi_correspondence_mutation();
