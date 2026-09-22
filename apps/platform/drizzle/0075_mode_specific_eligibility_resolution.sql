ALTER TABLE "app_authoritative_eligibility_outcomes"
  ADD COLUMN "evaluated_value_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL;
