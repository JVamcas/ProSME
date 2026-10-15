ALTER TABLE "app_form_versions"
  ADD COLUMN IF NOT EXISTS "show_completeness" boolean NOT NULL DEFAULT true;
