CREATE TABLE IF NOT EXISTS app_chatbot_knowledge_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'PREPARED',
  content_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  prepared_by uuid NOT NULL REFERENCES app_users(id),
  prepared_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  CONSTRAINT app_chatbot_release_hash_unique UNIQUE(id, content_hash),
  CONSTRAINT app_chatbot_release_hash_check CHECK(content_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT app_chatbot_release_status_check CHECK(status IN ('PREPARED', 'APPROVED')),
  CONSTRAINT app_chatbot_release_snapshot_check CHECK(jsonb_typeof(snapshot) = 'object' AND snapshot->>'schemaVersion' = '1'),
  CONSTRAINT app_chatbot_release_approval_check CHECK((status = 'APPROVED') = (approved_at IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_chatbot_knowledge_approvals (
  release_id uuid PRIMARY KEY,
  content_hash text NOT NULL,
  approved_by uuid NOT NULL REFERENCES app_users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_chatbot_approval_content_fk FOREIGN KEY(release_id, content_hash)
    REFERENCES app_chatbot_knowledge_releases(id, content_hash)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_chatbot_knowledge_state (
  key text PRIMARY KEY CHECK(key = 'ACTIVE'),
  active_release_id uuid REFERENCES app_chatbot_knowledge_releases(id)
);
INSERT INTO app_chatbot_knowledge_state(key) VALUES ('ACTIVE') ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_chatbot_knowledge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES app_chatbot_knowledge_releases(id),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  action text NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_chatbot_release_prepared_idx ON app_chatbot_knowledge_releases(prepared_at DESC, id DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_chatbot_guard_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
    OR NEW.content_hash IS DISTINCT FROM OLD.content_hash OR NEW.prepared_by IS DISTINCT FROM OLD.prepared_by
    OR NEW.prepared_at IS DISTINCT FROM OLD.prepared_at
    OR OLD.status = 'APPROVED' THEN
    RAISE EXCEPTION 'Prepared and approved chatbot content is immutable; prepare a new release';
  END IF;
  IF NEW.status = 'APPROVED' AND NOT EXISTS (
    SELECT 1 FROM app_chatbot_knowledge_approvals
    WHERE release_id = NEW.id AND content_hash = NEW.content_hash
  ) THEN
    RAISE EXCEPTION 'Exact chatbot content approval is required';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS app_chatbot_snapshot_immutable ON app_chatbot_knowledge_releases;
CREATE TRIGGER app_chatbot_snapshot_immutable BEFORE UPDATE ON app_chatbot_knowledge_releases
  FOR EACH ROW EXECUTE FUNCTION app_chatbot_guard_snapshot();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_chatbot_guard_approval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Chatbot approvals are immutable';
END;
$$;
DROP TRIGGER IF EXISTS app_chatbot_approval_immutable ON app_chatbot_knowledge_approvals;
CREATE TRIGGER app_chatbot_approval_immutable BEFORE UPDATE OR DELETE ON app_chatbot_knowledge_approvals
  FOR EACH ROW EXECUTE FUNCTION app_chatbot_guard_approval();
DROP TRIGGER IF EXISTS app_chatbot_audit_immutable ON app_chatbot_knowledge_audit;
CREATE TRIGGER app_chatbot_audit_immutable BEFORE UPDATE OR DELETE ON app_chatbot_knowledge_audit
  FOR EACH ROW EXECUTE FUNCTION app_chatbot_guard_approval();
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('chatbot.knowledge.read.all', 'Preview all prepared public chatbot knowledge; no transcript access.'),
  ('chatbot.knowledge.prepare.all', 'Select public sources and prepare immutable chatbot knowledge snapshots.'),
  ('chatbot.knowledge.approve.all', 'Approve exact reviewed chatbot knowledge after source revalidation.'),
  ('chatbot.knowledge.publish.all', 'Publish verified approved chatbot knowledge artifacts.'),
  ('chatbot.knowledge.withdraw.all', 'Withdraw chatbot knowledge releases.'),
  ('chatbot.escalation.read.assigned', 'Read protected histories for cases currently assigned to the actor.'),
  ('chatbot.escalation.read.all', 'Read all protected chatbot case histories.'),
  ('chatbot.escalation.assign.all', 'Assign chatbot cases to staff authorized for case access.'),
  ('chatbot.escalation.resolve.assigned', 'Resolve cases currently assigned to the actor.'),
  ('chatbot.escalation.resolve.all', 'Resolve all chatbot cases.'),
  ('chatbot.retention.update.all', 'Configure bounded chatbot history and contact retention.')
ON CONFLICT (code) DO NOTHING;
