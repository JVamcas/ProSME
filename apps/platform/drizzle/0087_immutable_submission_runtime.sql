CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
ALTER TABLE "app_application_submission_snapshots"
  ADD COLUMN "schema_version" integer,
  ADD COLUMN "snapshot_content" jsonb,
  ADD COLUMN "canonical_content" text,
  ADD COLUMN "integrity_hash" text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_canonical_jsonb(value jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT CASE jsonb_typeof(value)
    WHEN 'object' THEN (
      SELECT '{' || COALESCE(string_agg(
        to_jsonb(entry.key)::text || ':' || app_canonical_jsonb(entry.value),
        ',' ORDER BY entry.key
      ), '') || '}'
      FROM jsonb_each(value) entry
    )
    WHEN 'array' THEN (
      SELECT '[' || COALESCE(string_agg(
        app_canonical_jsonb(entry.value),
        ',' ORDER BY entry.ordinality
      ), '') || ']'
      FROM jsonb_array_elements(value) WITH ORDINALITY entry(value, ordinality)
    )
    ELSE value::text
  END
$$;
--> statement-breakpoint
UPDATE "app_application_submission_snapshots" snapshot
SET "schema_version" = 1,
    "snapshot_content" = jsonb_build_object(
      'application', snapshot.application_data
        || jsonb_build_object('rowVersion', snapshot.application_row_version),
      'applicant', '{}'::jsonb,
      'business', snapshot.business_data,
      'declarations', jsonb_build_object(
        'acceptance', snapshot.declaration_acceptance,
        'values', COALESCE(snapshot.application_data->'declarationsSection', '{}'::jsonb)
      ),
      'documents', snapshot.document_versions,
      'eligibilityRuleSetVersionId', snapshot.eligibility_rule_set_version_id,
      'form', jsonb_build_object(
        'normalizedValues', snapshot.normalized_form_values,
        'responseRowVersion', snapshot.response_row_version,
        'versionId', snapshot.form_version_id
      ),
      'fundingCall', jsonb_build_object(
        'id', snapshot.application_data->>'fundingOpportunityId'
      ),
      'reference', application.reference,
      'schemaVersion', 1,
      'submittedAt', to_jsonb(snapshot.submitted_at),
      'workflowTemplateVersionId', snapshot.workflow_template_version_id
    )
FROM "app_applications" application
WHERE application.id = snapshot.application_id;
--> statement-breakpoint
UPDATE "app_application_submission_snapshots"
SET "canonical_content" = app_canonical_jsonb("snapshot_content");
--> statement-breakpoint
UPDATE "app_application_submission_snapshots"
SET "integrity_hash" = encode(
  digest(convert_to("canonical_content", 'UTF8'), 'sha256'),
  'hex'
);
--> statement-breakpoint
ALTER TABLE "app_application_submission_snapshots"
  ALTER COLUMN "schema_version" SET NOT NULL,
  ALTER COLUMN "snapshot_content" SET NOT NULL,
  ALTER COLUMN "canonical_content" SET NOT NULL,
  ALTER COLUMN "integrity_hash" SET NOT NULL,
  ADD CONSTRAINT "app_submission_snapshots_schema_version_check"
    CHECK ("schema_version" > 0),
  ADD CONSTRAINT "app_submission_snapshots_integrity_hash_check"
    CHECK ("integrity_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "app_submission_snapshots_canonical_content_check"
    CHECK ("snapshot_content" = "canonical_content"::jsonb);
--> statement-breakpoint
CREATE FUNCTION app_reject_submission_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'application submission snapshots are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER app_submission_snapshots_immutable
BEFORE UPDATE OR DELETE ON "app_application_submission_snapshots"
FOR EACH ROW EXECUTE FUNCTION app_reject_submission_snapshot_mutation();
--> statement-breakpoint
ALTER TABLE "app_application_audit_entries"
  DROP CONSTRAINT "app_application_audit_entries_action_check",
  ADD CONSTRAINT "app_application_audit_entries_action_check"
    CHECK ("action" IN (
      'APPLICATION_DRAFT_CREATED',
      'APPLICATION_DRAFT_SAVED',
      'APPLICATION_SUBMITTED',
      'SUBMISSION_SNAPSHOT_ACCESSED'
    ));
