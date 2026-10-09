-- Keep existing primary sector text and historical application snapshots intact.
ALTER TABLE app_business_profiles ADD COLUMN IF NOT EXISTS secondary_sector text;
