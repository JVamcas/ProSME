CREATE TABLE IF NOT EXISTS "app_authorization_audit_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"target_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"role_code" text,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_authorization_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'authorization audit entries are immutable';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_authorization_audit_immutable ON "app_authorization_audit_entries";
--> statement-breakpoint
CREATE TRIGGER app_authorization_audit_immutable
BEFORE UPDATE OR DELETE ON "app_authorization_audit_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_authorization_audit_mutation();
