ALTER TABLE app_business_profiles ADD COLUMN IF NOT EXISTS applicant_position text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE app_business_profiles ADD COLUMN IF NOT EXISTS members jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
-- Only one-business owners have an unambiguous legacy position to carry forward.
-- Keep the legacy personal column for owners with multiple businesses to consult.
UPDATE app_business_profiles AS business
SET applicant_position = profile.position
FROM app_applicant_profiles AS profile
WHERE profile.user_id = business.user_id
  AND business.applicant_position = ''
  AND trim(profile.position) <> ''
  AND (SELECT count(*) FROM app_business_profiles AS owned WHERE owned.user_id = business.user_id) = 1;
