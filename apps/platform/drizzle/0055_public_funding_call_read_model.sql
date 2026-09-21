ALTER TABLE "app_funding_calls"
  ADD COLUMN "eligibility_summary" text;
--> statement-breakpoint
CREATE TABLE "app_funding_call_public_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "funding_call_id" uuid NOT NULL,
  "label" text NOT NULL,
  "url" text NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "published_at" timestamp with time zone,
  CONSTRAINT "app_funding_call_public_documents_display_order_check"
    CHECK ("display_order" >= 0),
  CONSTRAINT "app_funding_call_public_documents_url_check"
    CHECK ("url" ~ '^(https?://|/)')
);
--> statement-breakpoint
ALTER TABLE "app_funding_call_public_documents"
  ADD CONSTRAINT "app_funding_call_public_documents_call_fk"
  FOREIGN KEY ("funding_call_id")
  REFERENCES "public"."app_funding_calls"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "app_funding_call_public_documents_call_idx"
  ON "app_funding_call_public_documents" ("funding_call_id", "display_order");
