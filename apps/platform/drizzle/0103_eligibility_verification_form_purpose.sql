ALTER TABLE "app_form_definitions"
  DROP CONSTRAINT "app_form_definitions_purpose_check";
--> statement-breakpoint
ALTER TABLE "app_form_definitions"
  ADD CONSTRAINT "app_form_definitions_purpose_check"
  CHECK ("purpose" IN (
    'FUNDING_APPLICATION', 'APPLICATION_REVIEW',
    'ELIGIBILITY_VERIFICATION', 'COI', 'RFI', 'OTHER'
  ));
