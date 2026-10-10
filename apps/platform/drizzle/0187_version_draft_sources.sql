-- Record actual provenance. Unknown legacy asset provenance stays NULL rather
-- than being guessed from the latest published version.
ALTER TABLE app_form_versions ADD COLUMN IF NOT EXISTS source_version_id uuid
  REFERENCES app_form_versions(id) ON DELETE RESTRICT;
ALTER TABLE app_workflow_definition_versions ADD COLUMN IF NOT EXISTS source_version_id uuid
  REFERENCES app_workflow_definition_versions(id) ON DELETE RESTRICT;
ALTER TABLE app_eligibility_rule_set_versions ADD COLUMN IF NOT EXISTS source_version_id uuid
  REFERENCES app_eligibility_rule_set_versions(id) ON DELETE RESTRICT;
ALTER TABLE app_funding_call_draft_versions ADD COLUMN IF NOT EXISTS source_version_id uuid
  REFERENCES app_funding_call_publication_revisions(id) ON DELETE RESTRICT;
-- Previous funding call replacement creation always used its current publication;
-- a pending replacement cannot coexist with a later publication of the call.
UPDATE app_funding_call_draft_versions draft
SET source_version_id = call.current_published_version_id
FROM app_funding_calls call
WHERE call.id = draft.funding_call_id AND draft.source_version_id IS NULL;
--> statement-breakpoint
-- LIKE-based restore/test tables can have these indexes under generated names.
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT indexrelid::regclass AS index_name FROM pg_index
    WHERE indrelid IN ('app_form_versions'::regclass,
      'app_eligibility_rule_set_versions'::regclass)
      AND indisunique AND indnkeyatts = 1 AND indpred IS NOT NULL
      AND pg_get_expr(indpred, indrelid) LIKE '%DRAFT%'
  LOOP
    EXECUTE format('DROP INDEX %s', item.index_name);
  END LOOP;
END $$;
DROP INDEX IF EXISTS app_workflow_versions_one_draft_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS app_form_versions_source_draft_unique
  ON app_form_versions(form_definition_id, source_version_id) WHERE status = 'DRAFT';
CREATE UNIQUE INDEX IF NOT EXISTS app_workflow_versions_source_draft_unique
  ON app_workflow_definition_versions(definition_id, source_version_id) WHERE status = 'DRAFT';
CREATE UNIQUE INDEX IF NOT EXISTS app_eligibility_rule_set_versions_source_draft_unique
  ON app_eligibility_rule_set_versions(rule_set_id, source_version_id) WHERE status = 'DRAFT';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_version_draft_source() RETURNS trigger AS $$
BEGIN
  IF NEW.source_version_id IS DISTINCT FROM OLD.source_version_id THEN
    RAISE EXCEPTION 'Version draft source is immutable';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS app_form_version_source_guard ON app_form_versions;
CREATE TRIGGER app_form_version_source_guard BEFORE UPDATE ON app_form_versions
  FOR EACH ROW EXECUTE FUNCTION protect_version_draft_source();
DROP TRIGGER IF EXISTS app_workflow_version_source_guard ON app_workflow_definition_versions;
CREATE TRIGGER app_workflow_version_source_guard BEFORE UPDATE ON app_workflow_definition_versions
  FOR EACH ROW EXECUTE FUNCTION protect_version_draft_source();
DROP TRIGGER IF EXISTS app_eligibility_version_source_guard ON app_eligibility_rule_set_versions;
CREATE TRIGGER app_eligibility_version_source_guard BEFORE UPDATE ON app_eligibility_rule_set_versions
  FOR EACH ROW EXECUTE FUNCTION protect_version_draft_source();
DROP TRIGGER IF EXISTS app_funding_call_draft_source_guard ON app_funding_call_draft_versions;
CREATE TRIGGER app_funding_call_draft_source_guard BEFORE UPDATE ON app_funding_call_draft_versions
  FOR EACH ROW EXECUTE FUNCTION protect_version_draft_source();
