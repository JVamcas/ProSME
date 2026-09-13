DROP INDEX IF EXISTS "app_business_profiles_user_unique";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_business_profiles_user_idx"
  ON "app_business_profiles" ("user_id");
