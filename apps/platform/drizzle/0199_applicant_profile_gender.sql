ALTER TABLE app_applicant_profiles ADD COLUMN gender text;
--> statement-breakpoint
ALTER TABLE app_applicant_profiles ADD CONSTRAINT app_applicant_profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('Female', 'Male', 'Other', 'Prefer not to say'));
