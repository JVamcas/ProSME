CREATE TABLE "app_applicant_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "first_name" text NOT NULL,
  "surname" text NOT NULL,
  "position" text NOT NULL,
  "phone_number" text NOT NULL,
  "date_of_birth" date,
  "nationality" text DEFAULT 'Namibian' NOT NULL,
  "region" text NOT NULL,
  "postal_address" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_applicant_profiles_user_id_app_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_applicant_profiles_user_unique"
  ON "app_applicant_profiles" ("user_id");
--> statement-breakpoint
CREATE TABLE "app_business_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "legal_name" text NOT NULL,
  "trading_name" text DEFAULT '' NOT NULL,
  "registration_number" text DEFAULT '' NOT NULL,
  "business_type" text NOT NULL,
  "sector" text NOT NULL,
  "region" text NOT NULL,
  "physical_address" text NOT NULL,
  "established_year" integer,
  "employee_count" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_business_profiles_user_id_app_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_business_profiles_user_unique"
  ON "app_business_profiles" ("user_id");
--> statement-breakpoint
CREATE TABLE "app_profile_audit_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "action" text NOT NULL,
  "changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_profile_audit_actor_user_id_app_users_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "app_users"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX "app_profile_audit_entity_idx"
  ON "app_profile_audit_entries" ("entity_type", "entity_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_profile_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'profile audit entries are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_profile_audit_immutable
BEFORE UPDATE OR DELETE ON "app_profile_audit_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_profile_audit_mutation();
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('profile.read.own', 'Read the current applicant profile'),
  ('profile.update.own', 'Update the current applicant profile'),
  ('business.read.own', 'Read the current applicant business profile'),
  ('business.update.own', 'Update the current applicant business profile')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'applicant'
  AND capability_row."code" IN (
    'profile.read.own',
    'profile.update.own',
    'business.read.own',
    'business.update.own'
  )
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
--> statement-breakpoint
DELETE FROM "app_role_capabilities" role_capability
USING "app_roles" role_row, "app_capabilities" capability_row
WHERE role_capability."role_id" = role_row."id"
  AND role_capability."capability_id" = capability_row."id"
  AND role_row."code" = 'applicant'
  AND capability_row."code" IN (
    'application.create',
    'application.read.own',
    'application.submit'
  );
