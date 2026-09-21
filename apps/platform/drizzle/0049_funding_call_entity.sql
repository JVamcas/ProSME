CREATE TABLE "app_funding_calls" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "reference" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "funding_instrument" text,
  "thematic_area" text,
  "total_budget_envelope" numeric(18, 2) NOT NULL,
  "minimum_grant_amount" numeric(18, 2) NOT NULL,
  "maximum_grant_amount" numeric(18, 2) NOT NULL,
  "opens_at" timestamp with time zone NOT NULL,
  "closes_at" timestamp with time zone NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "public_contact_name" text,
  "public_contact_email" text,
  "public_contact_phone" text,
  "row_version" integer DEFAULT 1 NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "updated_by" uuid NOT NULL REFERENCES "app_users"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_funding_calls_status_check"
    CHECK ("status" IN ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED')),
  CONSTRAINT "app_funding_calls_budget_check" CHECK (
    "total_budget_envelope" >= 0
    AND "minimum_grant_amount" >= 0
    AND "maximum_grant_amount" >= "minimum_grant_amount"
    AND "total_budget_envelope" >= "maximum_grant_amount"
  ),
  CONSTRAINT "app_funding_calls_dates_check" CHECK ("closes_at" > "opens_at"),
  CONSTRAINT "app_funding_calls_row_version_check" CHECK ("row_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_calls_reference_unique"
  ON "app_funding_calls" ("reference");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_funding_calls_slug_unique"
  ON "app_funding_calls" ("slug");
--> statement-breakpoint
CREATE INDEX "app_funding_calls_status_dates_idx"
  ON "app_funding_calls" ("status", "opens_at", "closes_at");
--> statement-breakpoint
DELETE FROM "app_capabilities"
WHERE "code" LIKE 'cms.funding-calls.%';
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('funding.call.read', 'Read funding calls'),
  ('funding.call.create', 'Create draft funding calls'),
  ('funding.call.update', 'Update draft funding calls')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row.id, capability_row.id
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row.code IN ('applicant', 'programme_officer', 'system_administrator')
  AND capability_row.code = 'funding.call.read'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row.id, capability_row.id
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row.code IN ('programme_officer', 'system_administrator')
  AND capability_row.code IN ('funding.call.create', 'funding.call.update')
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
