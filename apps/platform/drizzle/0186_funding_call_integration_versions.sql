DROP INDEX IF EXISTS app_funding_call_integration_version_unique;
-- LIKE-based test/restore tables can have the same legacy index under a generated name.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT indexrelid::regclass AS index_name FROM pg_index
    WHERE indrelid = 'app_funding_call_eligibility_integration_bindings'::regclass
      AND indisunique AND indnkeyatts = 2
      AND pg_get_indexdef(indexrelid) LIKE '%(funding_call_id, integration_version_id)'
  LOOP EXECUTE format('DROP INDEX %s', item.index_name); END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS app_funding_call_version_integration_bindings (
  funding_call_id uuid NOT NULL REFERENCES app_funding_calls(id) ON DELETE RESTRICT,
  funding_call_version_id uuid NOT NULL,
  integration_version_id uuid NOT NULL REFERENCES app_eligibility_integration_versions(id) ON DELETE RESTRICT,
  binding_id uuid NOT NULL REFERENCES app_funding_call_eligibility_integration_bindings(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS app_call_version_integration_unique
  ON app_funding_call_version_integration_bindings(funding_call_version_id, integration_version_id);
CREATE INDEX IF NOT EXISTS app_call_version_integration_binding_idx
  ON app_funding_call_version_integration_bindings(binding_id);
--> statement-breakpoint
-- Keep legacy binding identities and execution history. The same immutable
-- legacy settings can belong to multiple historical publications.
INSERT INTO app_funding_call_version_integration_bindings
  (funding_call_id, funding_call_version_id, integration_version_id, binding_id)
SELECT binding.funding_call_id, publication.id, binding.integration_version_id, binding.id
FROM app_funding_call_eligibility_integration_bindings binding
JOIN app_funding_call_publication_revisions publication
  ON publication.funding_call_id = binding.funding_call_id
  AND publication.snapshot->>'workflowTemplateVersionId' = binding.workflow_template_version_id::text
AND NOT EXISTS (SELECT 1 FROM app_funding_call_version_integration_bindings existing WHERE existing.binding_id = binding.id)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
WITH copied AS (
  INSERT INTO app_funding_call_eligibility_integration_bindings
    (funding_call_id, workflow_template_version_id, integration_version_id,
     manual_fallback_allowed, provider_adapter_key, provider_display_name, secret_reference, created_by)
  SELECT binding.funding_call_id, binding.workflow_template_version_id, binding.integration_version_id,
    binding.manual_fallback_allowed, binding.provider_adapter_key, binding.provider_display_name,
    binding.secret_reference, draft.created_by
  FROM app_funding_call_draft_versions draft
  JOIN app_funding_calls call ON call.id = draft.funding_call_id
  JOIN app_funding_call_version_integration_bindings link
    ON link.funding_call_version_id = call.current_published_version_id
  JOIN app_funding_call_eligibility_integration_bindings binding ON binding.id = link.binding_id
  WHERE NOT EXISTS (
    SELECT 1 FROM app_funding_call_version_integration_bindings existing
    WHERE existing.funding_call_version_id = draft.id
      AND existing.integration_version_id = binding.integration_version_id
  )
  RETURNING id, funding_call_id, integration_version_id
)
INSERT INTO app_funding_call_version_integration_bindings
  (funding_call_id, funding_call_version_id, integration_version_id, binding_id)
SELECT copied.funding_call_id, draft.id, copied.integration_version_id, copied.id
FROM copied JOIN app_funding_call_draft_versions draft ON draft.funding_call_id = copied.funding_call_id;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_call_integration_binding() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM app_funding_call_version_integration_bindings link
    JOIN app_funding_call_publication_revisions publication ON publication.id = link.funding_call_version_id
    WHERE link.binding_id = OLD.id
  ) THEN RAISE EXCEPTION 'Published funding call integration bindings are immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.id <> OLD.id OR NEW.funding_call_id <> OLD.funding_call_id
    OR NEW.integration_version_id <> OLD.integration_version_id THEN
    RAISE EXCEPTION 'Integration binding identity is immutable';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS app_call_integration_binding_guard ON app_funding_call_eligibility_integration_bindings;
CREATE TRIGGER app_call_integration_binding_guard BEFORE UPDATE OR DELETE
  ON app_funding_call_eligibility_integration_bindings
  FOR EACH ROW EXECUTE FUNCTION protect_call_integration_binding();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_call_integration_version_link() RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Funding call integration version links are immutable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM app_funding_call_eligibility_integration_bindings binding
    WHERE binding.id = NEW.binding_id AND binding.funding_call_id = NEW.funding_call_id
      AND binding.integration_version_id = NEW.integration_version_id
  ) OR NOT (
    EXISTS (SELECT 1 FROM app_funding_call_draft_versions draft
      WHERE draft.id = NEW.funding_call_version_id AND draft.funding_call_id = NEW.funding_call_id)
    OR EXISTS (SELECT 1 FROM app_funding_call_publication_revisions publication
      WHERE publication.id = NEW.funding_call_version_id AND publication.funding_call_id = NEW.funding_call_id)
  ) THEN RAISE EXCEPTION 'Integration binding and version must belong to the same funding call'; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS app_call_integration_version_link_guard ON app_funding_call_version_integration_bindings;
CREATE TRIGGER app_call_integration_version_link_guard BEFORE INSERT OR UPDATE OR DELETE
  ON app_funding_call_version_integration_bindings
  FOR EACH ROW EXECUTE FUNCTION protect_call_integration_version_link();
