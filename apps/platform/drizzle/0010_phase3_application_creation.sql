CREATE TABLE "app_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"funding_opportunity_id" integer NOT NULL,
	"funding_opportunity_title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_section" text DEFAULT 'business' NOT NULL,
	"business_section" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_section" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"financial_section" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"section_completion" jsonb DEFAULT '{"business":false,"project":false,"financial":false}'::jsonb NOT NULL,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_applications_status_check" CHECK ("status" = 'draft'),
	CONSTRAINT "app_applications_current_section_check" CHECK ("current_section" IN ('business', 'project', 'financial'))
);
--> statement-breakpoint
ALTER TABLE "app_applications" ADD CONSTRAINT "app_applications_owner_user_id_app_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_applications_owner_opportunity_unique" ON "app_applications" USING btree ("owner_user_id","funding_opportunity_id");--> statement-breakpoint
CREATE INDEX "app_applications_owner_updated_idx" ON "app_applications" USING btree ("owner_user_id","updated_at");--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('application.create', 'Create an application'),
  ('application.read.own', 'Read own applications'),
  ('application.update.own', 'Update own applications')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'applicant'
  AND capability_row."code" IN (
    'application.create',
    'application.read.own',
    'application.update.own'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
