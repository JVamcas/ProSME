CREATE TABLE IF NOT EXISTS app_chatbot_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_name text NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  file_bytes integer NOT NULL CHECK (file_bytes BETWEEN 1 AND 5242880),
  extracted_text text NOT NULL CHECK (length(extracted_text) BETWEEN 1 AND 200000),
  content_hash text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_chatbot_document_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES app_chatbot_documents(id),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  action text NOT NULL CHECK (action = 'UPLOADED'),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE app_chatbot_resources DROP CONSTRAINT IF EXISTS app_chatbot_resources_resource_key_check;
ALTER TABLE app_chatbot_resources ADD CONSTRAINT app_chatbot_resources_resource_key_check
CHECK (resource_key ~ '^((funding|eligibility|document):[a-fA-F0-9-]{36}|faq:[1-9][0-9]{0,9}|contact:contact-details)$');
--> statement-breakpoint
INSERT INTO app_capabilities(code, description)
VALUES ('chatbot.knowledge.document.upload.all', 'Upload programme documents for chatbot knowledge review without activating them.')
ON CONFLICT (code) DO NOTHING;
INSERT INTO app_role_capabilities(role_id, capability_id)
SELECT role.id, permission.id FROM app_roles role CROSS JOIN app_capabilities permission
WHERE role.code = 'system_administrator' AND permission.code = 'chatbot.knowledge.document.upload.all'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DROP TRIGGER IF EXISTS app_chatbot_source_changed ON app_chatbot_documents;
CREATE TRIGGER app_chatbot_source_changed AFTER INSERT OR UPDATE OR DELETE ON app_chatbot_documents
FOR EACH STATEMENT EXECUTE FUNCTION app_chatbot_capture_source_change();
