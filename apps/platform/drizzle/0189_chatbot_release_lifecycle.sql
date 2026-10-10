ALTER TABLE app_chatbot_knowledge_state ADD COLUMN IF NOT EXISTS epoch bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS app_chatbot_release_artifacts (
  release_id uuid PRIMARY KEY REFERENCES app_chatbot_knowledge_releases(id),
  verified jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_chatbot_release_revocations (
  release_id uuid PRIMARY KEY REFERENCES app_chatbot_knowledge_releases(id),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_chatbot_source_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch bigint NOT NULL UNIQUE,
  release_id uuid NOT NULL REFERENCES app_chatbot_knowledge_releases(id),
  source_table text NOT NULL,
  candidate_id uuid REFERENCES app_chatbot_knowledge_releases(id),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_chatbot_source_jobs_pending ON app_chatbot_source_jobs(epoch) WHERE processed_at IS NULL;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_chatbot_artifact_immutable ON app_chatbot_release_artifacts;
CREATE TRIGGER app_chatbot_artifact_immutable BEFORE UPDATE OR DELETE ON app_chatbot_release_artifacts
  FOR EACH ROW EXECUTE FUNCTION app_chatbot_guard_approval();
DROP TRIGGER IF EXISTS app_chatbot_revocation_immutable ON app_chatbot_release_revocations;
CREATE TRIGGER app_chatbot_revocation_immutable BEFORE UPDATE OR DELETE ON app_chatbot_release_revocations
  FOR EACH ROW EXECUTE FUNCTION app_chatbot_guard_approval();
--> statement-breakpoint
-- A transactional source outbox also captures CMS writes/deletes, bypassed hooks,
-- publication/lifecycle changes, and mutable eligibility dependencies. No text is copied.
CREATE OR REPLACE FUNCTION app_chatbot_capture_source_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE state_record record;
BEGIN
  UPDATE app_chatbot_knowledge_state SET epoch = epoch + 1 WHERE key = 'ACTIVE'
    RETURNING epoch, active_release_id INTO state_record;
  IF state_record.active_release_id IS NOT NULL THEN
    INSERT INTO app_chatbot_source_jobs(epoch, release_id, source_table)
      VALUES (state_record.epoch, state_record.active_release_id, TG_TABLE_NAME);
  END IF;
  RETURN NULL;
END;
$$;
DO $$
DECLARE source_table text;
BEGIN
  FOREACH source_table IN ARRAY ARRAY[
    'app_funding_calls', 'app_funding_call_publication_revisions', 'cms_faqs',
    'app_eligibility_rule_set_versions', 'app_eligibility_rules',
    'app_eligibility_input_definitions', 'app_eligibility_self_check_questions', 'app_condition_groups'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS app_chatbot_source_changed ON %I', source_table);
    EXECUTE format('CREATE TRIGGER app_chatbot_source_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION app_chatbot_capture_source_change()', source_table);
  END LOOP;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_chatbot_guard_activation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.active_release_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM app_chatbot_knowledge_releases r
      JOIN app_chatbot_release_artifacts a ON a.release_id = r.id
      JOIN app_chatbot_knowledge_approvals approval ON approval.release_id = r.id AND approval.content_hash = r.content_hash
    WHERE r.id = NEW.active_release_id AND r.status = 'APPROVED'
      AND NOT EXISTS (SELECT 1 FROM app_chatbot_release_revocations WHERE release_id = r.id)
  ) THEN
    RAISE EXCEPTION 'Only verified approved non-revoked chatbot releases may activate';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS app_chatbot_activation_guard ON app_chatbot_knowledge_state;
CREATE TRIGGER app_chatbot_activation_guard BEFORE UPDATE OF active_release_id ON app_chatbot_knowledge_state
  FOR EACH ROW EXECUTE FUNCTION app_chatbot_guard_activation();
