CREATE TABLE IF NOT EXISTS app_chatbot_resources (
  resource_key text PRIMARY KEY CHECK (resource_key ~ '^((funding|eligibility):[a-fA-F0-9-]{36}|faq:[1-9][0-9]{0,9}|contact:contact-details)$'),
  active boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_chatbot_resource_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  resource_keys jsonb NOT NULL,
  before_state jsonb NOT NULL,
  active boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Preserve selected sources from the currently active release without overwriting later staff choices.
INSERT INTO app_chatbot_resources(resource_key, active, updated_by)
SELECT selected.key, true, r.prepared_by
FROM app_chatbot_knowledge_state s JOIN app_chatbot_knowledge_releases r ON r.id = s.active_release_id
CROSS JOIN LATERAL (
  SELECT 'funding:' || value AS key FROM jsonb_array_elements_text(r.snapshot->'selection'->'fundingCallIds')
  UNION ALL
  SELECT 'faq:' || value FROM jsonb_array_elements_text(r.snapshot->'selection'->'faqIds')
  UNION ALL
  SELECT 'eligibility:' || value FROM jsonb_array_elements_text(r.snapshot->'selection'->'fundingCallIds')
) selected
WHERE NOT EXISTS (SELECT 1 FROM app_chatbot_knowledge_audit a WHERE a.release_id = r.id AND a.action = 'SOURCE_PUBLICATION_ACCEPTED')
ON CONFLICT (resource_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('chatbot.knowledge.activate.all', 'Activate published resources for chatbot answers.'),
  ('chatbot.knowledge.deactivate.all', 'Deactivate resources so the chatbot stops using them.')
ON CONFLICT (code) DO NOTHING;
-- Carry forward equivalent existing release publication/withdrawal grants.
INSERT INTO app_role_capabilities(role_id, capability_id)
SELECT rc.role_id, target.id FROM app_role_capabilities rc
JOIN app_capabilities old ON old.id = rc.capability_id
JOIN app_capabilities target ON target.code = CASE old.code
  WHEN 'chatbot.knowledge.publish.all' THEN 'chatbot.knowledge.activate.all'
  WHEN 'chatbot.knowledge.withdraw.all' THEN 'chatbot.knowledge.deactivate.all' END
WHERE old.code IN ('chatbot.knowledge.publish.all', 'chatbot.knowledge.withdraw.all')
  AND NOT EXISTS (SELECT 1 FROM app_role_capabilities existing WHERE existing.role_id = rc.role_id AND existing.capability_id = target.id);
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_chatbot_source_changed ON app_chatbot_resources;
CREATE TRIGGER app_chatbot_source_changed AFTER INSERT OR UPDATE OR DELETE ON app_chatbot_resources
FOR EACH STATEMENT EXECUTE FUNCTION app_chatbot_capture_source_change();
CREATE INDEX IF NOT EXISTS app_chatbot_automatic_release_hash ON app_chatbot_knowledge_releases(content_hash, prepared_at DESC) WHERE status = 'APPROVED';
DROP TRIGGER IF EXISTS app_chatbot_source_changed ON cms_contact_details;
CREATE TRIGGER app_chatbot_source_changed AFTER INSERT OR UPDATE OR DELETE ON cms_contact_details
FOR EACH STATEMENT EXECUTE FUNCTION app_chatbot_capture_source_change();
