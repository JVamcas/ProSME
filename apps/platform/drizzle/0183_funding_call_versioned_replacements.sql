CREATE TABLE app_funding_call_draft_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_call_id uuid NOT NULL REFERENCES app_funding_calls(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT'
    CONSTRAINT app_funding_call_draft_version_status_check
      CHECK (status IN ('DRAFT', 'APPROVAL_PENDING', 'APPROVED')),
  snapshot jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX app_funding_call_one_working_version
  ON app_funding_call_draft_versions(funding_call_id);
--> statement-breakpoint
ALTER TABLE app_funding_calls ADD COLUMN current_published_version_id uuid;
ALTER TABLE app_applications ADD COLUMN funding_call_version_id uuid;
ALTER TABLE app_funding_call_governance_reviews ADD COLUMN funding_call_version_id uuid;
--> statement-breakpoint
-- Historical publications and submission snapshots are never rewritten.
UPDATE app_funding_calls call SET current_published_version_id = revision.id
FROM (
  SELECT DISTINCT ON (funding_call_id) funding_call_id, id
  FROM app_funding_call_publication_revisions
  ORDER BY funding_call_id, revision_number DESC
) revision WHERE revision.funding_call_id = call.id;
--> statement-breakpoint
-- Preserve in-progress legacy amendments as working versions. Fresh approval is
-- required for their replacement, even if the previous amendment was approved.
INSERT INTO app_funding_call_draft_versions (
  funding_call_id, snapshot, created_by, updated_by, created_at, updated_at
)
SELECT call.id, revision.snapshot || jsonb_build_object(
  'title', call.title, 'description', call.description,
  'eligibilitySummary', call.eligibility_summary,
  'formVersionId', call.form_version_id,
  'eligibilityRuleSetVersionId', call.eligibility_rule_set_version_id,
  'workflowTemplateVersionId', call.workflow_template_version_id,
  'allowResubmissionAfterWithdrawal', call.allow_resubmission_after_withdrawal,
  'applicationDuplicatePolicy', call.application_duplicate_policy,
  'fundingInstrument', call.funding_instrument, 'thematicArea', call.thematic_area,
  'totalBudgetEnvelope', call.total_budget_envelope::text,
  'minimumGrantAmount', call.minimum_grant_amount::text,
  'maximumGrantAmount', call.maximum_grant_amount::text,
  'opensAt', call.opens_at, 'closesAt', call.closes_at,
  'publicContactName', call.public_contact_name,
  'publicContactEmail', call.public_contact_email,
  'publicContactPhone', call.public_contact_phone,
  'thumbnailContentType', call.thumbnail_content_type,
  'thumbnailFileName', call.thumbnail_file_name,
  'thumbnailObjectKey', call.thumbnail_object_key
), call.created_by, call.updated_by, call.created_at, call.updated_at
FROM app_funding_calls call
JOIN app_funding_call_publication_revisions revision ON revision.id = call.current_published_version_id
WHERE call.status IN ('DRAFT', 'APPROVAL_PENDING', 'APPROVED');
--> statement-breakpoint
UPDATE app_funding_call_governance_reviews review
SET outcome = 'WITHDRAWN', decided_by = review.submitted_by,
    decided_at = now(), decision_row_version = review.submitted_row_version + 1,
    reason = NULL
FROM app_funding_call_draft_versions draft
WHERE review.funding_call_id = draft.funding_call_id AND review.outcome = 'PENDING';
--> statement-breakpoint
INSERT INTO app_authorization_audit_entries (action, actor_id, changes)
SELECT 'funding_call.version.legacy_amendment_migrated', draft.updated_by,
  jsonb_build_object('fundingCallId', draft.funding_call_id,
    'versionId', draft.id, 'freshApprovalRequired', true)
FROM app_funding_call_draft_versions draft;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_funding_call_attachments_immutable ON app_funding_calls;
DROP TRIGGER IF EXISTS app_funding_calls_governed_configuration ON app_funding_calls;
--> statement-breakpoint
-- Restore the effective projection from immutable publications before enabling
-- the new guard. Unpublished legacy amendments no longer affect intake.
UPDATE app_funding_calls call SET
  title = revision.snapshot->>'title', description = revision.snapshot->>'description',
  eligibility_summary = revision.snapshot->>'eligibilitySummary',
  form_version_id = (revision.snapshot->>'formVersionId')::uuid,
  eligibility_rule_set_version_id = (revision.snapshot->>'eligibilityRuleSetVersionId')::uuid,
  workflow_template_version_id = (revision.snapshot->>'workflowTemplateVersionId')::uuid,
  application_duplicate_policy = revision.snapshot->>'applicationDuplicatePolicy',
  allow_resubmission_after_withdrawal = coalesce((revision.snapshot->>'allowResubmissionAfterWithdrawal')::boolean, false),
  funding_instrument = revision.snapshot->>'fundingInstrument',
  thematic_area = revision.snapshot->>'thematicArea',
  total_budget_envelope = (revision.snapshot->>'totalBudgetEnvelope')::numeric,
  minimum_grant_amount = (revision.snapshot->>'minimumGrantAmount')::numeric,
  maximum_grant_amount = (revision.snapshot->>'maximumGrantAmount')::numeric,
  opens_at = (revision.snapshot->>'opensAt')::timestamptz,
  closes_at = (revision.snapshot->>'closesAt')::timestamptz,
  public_contact_name = revision.snapshot->>'publicContactName',
  public_contact_email = revision.snapshot->>'publicContactEmail',
  public_contact_phone = revision.snapshot->>'publicContactPhone',
  thumbnail_content_type = revision.snapshot->>'thumbnailContentType',
  thumbnail_file_name = revision.snapshot->>'thumbnailFileName',
  thumbnail_object_key = revision.snapshot->>'thumbnailObjectKey',
  status = CASE WHEN call.status IN ('DRAFT', 'APPROVAL_PENDING', 'APPROVED') THEN
    CASE WHEN now() >= (revision.snapshot->>'closesAt')::timestamptz THEN 'CLOSED'
      WHEN now() < (revision.snapshot->>'opensAt')::timestamptz THEN 'SCHEDULED' ELSE 'LIVE' END
    ELSE call.status END,
  row_version = call.row_version + 1
FROM app_funding_call_publication_revisions revision
WHERE revision.id = call.current_published_version_id;
--> statement-breakpoint
-- Submitted applications use their original recorded publication, when present.
-- Backfills retain the existing lifecycle guard and advance concurrency tokens.
UPDATE app_applications application SET funding_call_version_id = revision.id,
  row_version = application.row_version + 1
FROM app_application_submission_snapshots submission
JOIN app_funding_call_publication_revisions revision
  ON revision.id::text = submission.snapshot_content->'fundingCall'->>'publicationRevisionId'
WHERE submission.application_id = application.id
  AND revision.funding_call_id = application.funding_opportunity_id;
--> statement-breakpoint
-- Existing drafts retain the exact published configuration effective at creation.
-- A missing historical publication stays unbound and fails readiness instead of
-- silently switching an application's configuration to the latest publication.
WITH original_publications AS (
  SELECT application.id, (
    SELECT revision.id FROM app_funding_call_publication_revisions revision
    WHERE revision.funding_call_id = application.funding_opportunity_id
      AND revision.published_at <= application.created_at
      AND revision.snapshot->>'formVersionId' = application.form_version_id::text
      AND revision.snapshot->>'eligibilityRuleSetVersionId' = application.eligibility_rule_set_version_id::text
    ORDER BY revision.revision_number DESC LIMIT 1
  ) AS version_id
  FROM app_applications application WHERE application.funding_call_version_id IS NULL
)
UPDATE app_applications application SET funding_call_version_id = original.version_id,
  row_version = application.row_version + 1
FROM original_publications original
WHERE original.id = application.id AND original.version_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE app_funding_call_publication_revisions
  ADD CONSTRAINT app_funding_call_publication_call_id_unique UNIQUE (funding_call_id, id);
ALTER TABLE app_funding_calls ADD CONSTRAINT app_funding_call_current_version_fk
  FOREIGN KEY (id, current_published_version_id)
  REFERENCES app_funding_call_publication_revisions(funding_call_id, id) ON DELETE RESTRICT;
ALTER TABLE app_applications ADD CONSTRAINT app_application_call_version_fk
  FOREIGN KEY (funding_opportunity_id, funding_call_version_id)
  REFERENCES app_funding_call_publication_revisions(funding_call_id, id) ON DELETE RESTRICT;
CREATE INDEX app_applications_call_version_idx ON app_applications(funding_call_version_id);
--> statement-breakpoint
-- Replacing a call changes the effective projection, not any pinned application.
DROP TRIGGER IF EXISTS app_funding_call_attachments_immutable ON app_funding_calls;
DROP TRIGGER IF EXISTS app_application_lock_funding_call_attachments ON app_applications;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_application_call_version()
RETURNS trigger AS $$
DECLARE publication app_funding_call_publication_revisions%ROWTYPE;
DECLARE call app_funding_calls%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.funding_call_version_id IS DISTINCT FROM OLD.funding_call_version_id
      OR NEW.funding_opportunity_id IS DISTINCT FROM OLD.funding_opportunity_id
      OR (OLD.funding_call_version_id IS NOT NULL AND (
        NEW.form_version_id IS DISTINCT FROM OLD.form_version_id
        OR NEW.eligibility_rule_set_version_id IS DISTINCT FROM OLD.eligibility_rule_set_version_id
      )) THEN
      RAISE EXCEPTION 'Application funding call version and configuration are immutable';
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO call FROM app_funding_calls WHERE id = NEW.funding_opportunity_id FOR UPDATE;
  IF NEW.funding_call_version_id IS NULL
    OR NEW.funding_call_version_id IS DISTINCT FROM call.current_published_version_id
    OR call.status NOT IN ('SCHEDULED', 'LIVE')
    OR now() < call.opens_at OR now() >= call.closes_at THEN
    RAISE EXCEPTION 'New applications require the current published funding call version and an open intake';
  END IF;
  SELECT * INTO publication FROM app_funding_call_publication_revisions
    WHERE id = NEW.funding_call_version_id AND funding_call_id = NEW.funding_opportunity_id;
  IF NOT FOUND
    OR NEW.form_version_id::text IS DISTINCT FROM publication.snapshot->>'formVersionId'
    OR NEW.eligibility_rule_set_version_id::text IS DISTINCT FROM publication.snapshot->>'eligibilityRuleSetVersionId' THEN
    RAISE EXCEPTION 'Application configuration must match its pinned funding call version';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_application_call_version_immutable
BEFORE INSERT OR UPDATE OF funding_call_version_id, funding_opportunity_id,
  form_version_id, eligibility_rule_set_version_id ON app_applications
FOR EACH ROW EXECUTE FUNCTION protect_application_call_version();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_effective_funding_call_version()
RETURNS trigger AS $$
DECLARE publication jsonb;
BEGIN
  IF OLD.current_published_version_id IS NOT NULL THEN
    IF NEW.reference IS DISTINCT FROM OLD.reference OR NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'Published funding calls retain their reference and public URL';
    END IF;
    IF NEW.current_published_version_id IS NULL THEN
      RAISE EXCEPTION 'A published funding call retains its current version';
    END IF;
    IF NEW.current_published_version_id IS DISTINCT FROM OLD.current_published_version_id THEN
      IF OLD.status IN ('WITHDRAWN', 'ARCHIVED') THEN
        RAISE EXCEPTION 'Publication cannot override withdrawal or archival';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM app_funding_call_publication_revisions replacement
        JOIN app_funding_call_publication_revisions previous
          ON previous.id = OLD.current_published_version_id
        WHERE replacement.id = NEW.current_published_version_id
          AND replacement.funding_call_id = OLD.id
          AND replacement.revision_number > previous.revision_number
      ) THEN
        RAISE EXCEPTION 'Publication supersedes the current version with a new version';
      END IF;
    END IF;
    IF NEW.status IN ('DRAFT', 'APPROVAL_PENDING', 'APPROVED') THEN
      RAISE EXCEPTION 'Replacement preparation cannot change effective funding call status';
    END IF;
  END IF;
  IF NEW.current_published_version_id IS NULL THEN RETURN NEW; END IF;
  SELECT snapshot INTO publication FROM app_funding_call_publication_revisions
    WHERE id = NEW.current_published_version_id AND funding_call_id = NEW.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current publication must belong to the funding call'; END IF;
  IF NEW.title IS DISTINCT FROM publication->>'title'
    OR NEW.description IS DISTINCT FROM publication->>'description'
    OR NEW.form_version_id::text IS DISTINCT FROM publication->>'formVersionId'
    OR NEW.eligibility_rule_set_version_id::text IS DISTINCT FROM publication->>'eligibilityRuleSetVersionId'
    OR NEW.workflow_template_version_id::text IS DISTINCT FROM publication->>'workflowTemplateVersionId'
    OR NEW.opens_at IS DISTINCT FROM (publication->>'opensAt')::timestamptz
    OR NEW.closes_at IS DISTINCT FROM (publication->>'closesAt')::timestamptz
    OR NEW.application_duplicate_policy IS DISTINCT FROM publication->>'applicationDuplicatePolicy'
    OR NEW.allow_resubmission_after_withdrawal IS DISTINCT FROM coalesce((publication->>'allowResubmissionAfterWithdrawal')::boolean, false)
    OR NEW.minimum_grant_amount IS DISTINCT FROM (publication->>'minimumGrantAmount')::numeric
    OR NEW.maximum_grant_amount IS DISTINCT FROM (publication->>'maximumGrantAmount')::numeric
    OR NEW.total_budget_envelope IS DISTINCT FROM (publication->>'totalBudgetEnvelope')::numeric
    OR NEW.funding_instrument IS DISTINCT FROM publication->>'fundingInstrument'
    OR NEW.thematic_area IS DISTINCT FROM publication->>'thematicArea'
    OR NEW.eligibility_summary IS DISTINCT FROM publication->>'eligibilitySummary'
    OR NEW.public_contact_name IS DISTINCT FROM publication->>'publicContactName'
    OR NEW.public_contact_email IS DISTINCT FROM publication->>'publicContactEmail'
    OR NEW.public_contact_phone IS DISTINCT FROM publication->>'publicContactPhone'
    OR NEW.thumbnail_object_key IS DISTINCT FROM publication->>'thumbnailObjectKey'
    OR NEW.thumbnail_content_type IS DISTINCT FROM publication->>'thumbnailContentType'
    OR NEW.thumbnail_file_name IS DISTINCT FROM publication->>'thumbnailFileName' THEN
    RAISE EXCEPTION 'Effective funding call configuration changes only through publication';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_funding_call_effective_version_immutable
BEFORE UPDATE ON app_funding_calls
FOR EACH ROW EXECUTE FUNCTION protect_effective_funding_call_version();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_funding_call_working_version()
RETURNS trigger AS $$
BEGIN
  IF NEW.funding_call_id IS DISTINCT FROM OLD.funding_call_id
    OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'A working version retains its funding call and version identity';
  END IF;
  IF OLD.status <> 'DRAFT' AND NEW.snapshot IS DISTINCT FROM OLD.snapshot THEN
    RAISE EXCEPTION 'Only draft funding call versions are editable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_funding_call_working_version_guard
BEFORE UPDATE ON app_funding_call_draft_versions
FOR EACH ROW EXECUTE FUNCTION protect_funding_call_working_version();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_funding_call_governed_configuration()
RETURNS trigger AS $$
BEGIN
  IF NEW.current_published_version_id IS NOT NULL THEN RETURN NEW; END IF;
  IF OLD.status <> 'DRAFT' AND (
    NEW.reference IS DISTINCT FROM OLD.reference
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.eligibility_summary IS DISTINCT FROM OLD.eligibility_summary
    OR NEW.eligibility_rule_set_version_id IS DISTINCT FROM OLD.eligibility_rule_set_version_id
    OR NEW.form_version_id IS DISTINCT FROM OLD.form_version_id
    OR NEW.workflow_template_version_id IS DISTINCT FROM OLD.workflow_template_version_id
    OR NEW.funding_instrument IS DISTINCT FROM OLD.funding_instrument
    OR NEW.thematic_area IS DISTINCT FROM OLD.thematic_area
    OR NEW.total_budget_envelope IS DISTINCT FROM OLD.total_budget_envelope
    OR NEW.minimum_grant_amount IS DISTINCT FROM OLD.minimum_grant_amount
    OR NEW.maximum_grant_amount IS DISTINCT FROM OLD.maximum_grant_amount
    OR NEW.opens_at IS DISTINCT FROM OLD.opens_at
    OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
    OR NEW.public_contact_name IS DISTINCT FROM OLD.public_contact_name
    OR NEW.public_contact_email IS DISTINCT FROM OLD.public_contact_email
    OR NEW.public_contact_phone IS DISTINCT FROM OLD.public_contact_phone
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  ) THEN
    RAISE EXCEPTION 'only draft funding call configuration can be edited';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_funding_calls_governed_configuration
BEFORE UPDATE ON "app_funding_calls"
FOR EACH ROW EXECUTE FUNCTION protect_funding_call_governed_configuration();
