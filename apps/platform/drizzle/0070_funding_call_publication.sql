CREATE TABLE "app_funding_call_publication_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "funding_call_id" uuid NOT NULL,
  "revision_number" integer NOT NULL,
  "source_row_version" integer NOT NULL,
  "published_status" text NOT NULL,
  "snapshot" jsonb NOT NULL,
  "lifecycle_history_id" uuid NOT NULL,
  "published_by" uuid NOT NULL,
  "published_at" timestamp with time zone NOT NULL,
  "correlation_id" uuid NOT NULL,
  CONSTRAINT "app_funding_call_publication_revision_number_check"
    CHECK ("revision_number" > 0),
  CONSTRAINT "app_funding_call_publication_source_version_check"
    CHECK ("source_row_version" > 0),
  CONSTRAINT "app_funding_call_publication_status_check"
    CHECK ("published_status" IN ('SCHEDULED', 'LIVE'))
);
--> statement-breakpoint
ALTER TABLE "app_funding_call_publication_revisions"
  ADD CONSTRAINT "app_funding_call_publication_call_fk"
  FOREIGN KEY ("funding_call_id")
  REFERENCES "public"."app_funding_calls"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_funding_call_publication_lifecycle_fk"
  FOREIGN KEY ("lifecycle_history_id")
  REFERENCES "public"."app_funding_call_lifecycle_history"("id")
  ON DELETE restrict ON UPDATE no action,
  ADD CONSTRAINT "app_funding_call_publication_publisher_fk"
  FOREIGN KEY ("published_by")
  REFERENCES "public"."app_users"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_call_publication_revision_unique"
  ON "app_funding_call_publication_revisions"
  ("funding_call_id", "revision_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_call_publication_lifecycle_unique"
  ON "app_funding_call_publication_revisions" ("lifecycle_history_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_funding_call_publication_revision()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'funding call publication revisions are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_funding_call_publication_revision_immutable
BEFORE UPDATE OR DELETE ON "app_funding_call_publication_revisions"
FOR EACH ROW EXECUTE FUNCTION protect_funding_call_publication_revision();

