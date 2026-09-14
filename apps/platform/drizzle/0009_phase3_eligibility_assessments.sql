CREATE TABLE "app_eligibility_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"funding_opportunity_id" integer NOT NULL,
	"funding_opportunity_title" text NOT NULL,
	"rule_set_version" text NOT NULL,
	"rule_snapshot" jsonb NOT NULL,
	"answers" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_eligibility_assessments" ADD CONSTRAINT "app_eligibility_assessments_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_eligibility_assessments_owner_created_idx" ON "app_eligibility_assessments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "app_eligibility_assessments_opportunity_idx" ON "app_eligibility_assessments" USING btree ("funding_opportunity_id");--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('eligibility.create', 'Create an eligibility assessment'),
  ('eligibility.read.own', 'Read own eligibility assessments')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'applicant'
  AND capability_row."code" IN ('eligibility.create', 'eligibility.read.own')
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
