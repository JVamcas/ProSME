CREATE TYPE "public"."app_user_status" AS ENUM('invited', 'active', 'suspended', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."app_user_type" AS ENUM('applicant', 'staff');--> statement-breakpoint
CREATE TABLE "app_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_role_capabilities" (
	"role_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	CONSTRAINT "app_role_capabilities_role_id_capability_id_pk" PRIMARY KEY("role_id","capability_id")
);
--> statement-breakpoint
CREATE TABLE "app_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "app_user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'firebase' NOT NULL,
	"subject" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"user_type" "app_user_type" DEFAULT 'applicant' NOT NULL,
	"status" "app_user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_role_capabilities" ADD CONSTRAINT "app_role_capabilities_role_id_app_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_role_capabilities" ADD CONSTRAINT "app_role_capabilities_capability_id_app_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."app_capabilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_roles" ADD CONSTRAINT "app_user_roles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_roles" ADD CONSTRAINT "app_user_roles_role_id_app_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."app_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_identities" ADD CONSTRAINT "app_user_identities_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_capabilities_code_unique" ON "app_capabilities" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_roles_code_unique" ON "app_roles" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_identities_provider_subject_unique" ON "app_user_identities" USING btree ("provider","subject");--> statement-breakpoint
CREATE INDEX "app_user_identities_user_idx" ON "app_user_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_unique" ON "app_users" USING btree ("email");
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('application.create', 'Create an application draft'),
  ('application.read.own', 'Read applications owned by the current applicant'),
  ('application.submit', 'Submit an owned application'),
  ('admin.access', 'Access the internal administration portal'),
  ('cms.access', 'Access the Payload CMS administration interface'),
  ('content.create', 'Create CMS content'),
  ('content.update', 'Update CMS content'),
  ('content.publish', 'Publish CMS content'),
  ('content.delete', 'Delete CMS content')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_roles" ("code", "name", "description") VALUES
  ('applicant', 'Applicant', 'External SME applicant'),
  ('cms_editor', 'CMS Editor', 'Creates and updates content without publishing'),
  ('programme_administrator', 'Programme Administrator', 'Programme operations administrator'),
  ('technical_assessor', 'Technical Assessor', 'Performs technical assessments'),
  ('finance_officer', 'Finance Officer', 'Performs financial review'),
  ('committee_member', 'Committee Member', 'Participates in committee decisions'),
  ('system_administrator', 'System Administrator', 'Full platform administration')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE
  (role_row."code" = 'applicant' AND capability_row."code" IN ('application.create', 'application.read.own', 'application.submit'))
  OR (role_row."code" = 'cms_editor' AND capability_row."code" IN ('cms.access', 'content.create', 'content.update'))
  OR (role_row."code" = 'programme_administrator' AND capability_row."code" IN ('admin.access', 'cms.access', 'content.create', 'content.update', 'content.publish'))
  OR (role_row."code" = 'system_administrator')
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
