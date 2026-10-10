CREATE TABLE IF NOT EXISTS app_chatbot_conversations (
  id uuid PRIMARY KEY,
  credential_hash text NOT NULL,
  notice_version text NOT NULL,
  expires_at timestamptz NOT NULL,
  history jsonb NOT NULL DEFAULT '[]',
  call_id uuid,
  completed_turns integer NOT NULL DEFAULT 0 CHECK(completed_turns BETWEEN 0 AND 30),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_chatbot_conversations_expiry ON app_chatbot_conversations(expires_at);
CREATE TABLE IF NOT EXISTS app_chatbot_turns (
  conversation_id uuid NOT NULL REFERENCES app_chatbot_conversations(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  input_hash text NOT NULL,
  claim_id uuid NOT NULL,
  claim_until timestamptz NOT NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS app_chatbot_one_pending_turn ON app_chatbot_turns(conversation_id) WHERE response IS NULL;
CREATE TABLE IF NOT EXISTS app_chatbot_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  last_turn_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'NEW' CHECK(state IN ('NEW','IN_PROGRESS','RESOLVED')),
  assigned_to uuid REFERENCES app_users(id),
  question text NOT NULL,
  history jsonb NOT NULL,
  reason text NOT NULL CHECK(reason IN ('MISSING_EVIDENCE','INSUFFICIENT_EVIDENCE','CONFLICTING_EVIDENCE','AMBIGUOUS_CALL','SCREENED_QUERY','SERVICE_FAILURE')),
  release_id uuid REFERENCES app_chatbot_knowledge_releases(id),
  source_ids jsonb NOT NULL,
  resolution_note text,
  contact jsonb,
  contact_expires_at timestamptz,
  expires_at timestamptz NOT NULL,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_chatbot_open_case ON app_chatbot_cases(conversation_id) WHERE state <> 'RESOLVED';
CREATE INDEX IF NOT EXISTS app_chatbot_case_queue ON app_chatbot_cases(state, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS app_chatbot_case_assignee ON app_chatbot_cases(assigned_to, updated_at DESC);
CREATE INDEX IF NOT EXISTS app_chatbot_case_expiry ON app_chatbot_cases(expires_at);
CREATE TABLE IF NOT EXISTS app_chatbot_case_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  actor_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  turn_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_chatbot_case_turn_audit ON app_chatbot_case_audit(case_id, turn_id) WHERE turn_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS app_chatbot_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS app_chatbot_operational_policy (
  key text PRIMARY KEY CHECK(key = 'POLICY'),
  policy jsonb NOT NULL,
  updated_by uuid NOT NULL REFERENCES app_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_chatbot_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES app_users(id),
  policy jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Register the configurable event without naming recipients or enabling delivery.
-- The standard notification UI owns rules, recipients, channels and templates.
INSERT INTO app_notification_catalogs(id, catalog_key, display_name, description, sort_order)
VALUES ('00000000-0000-4000-8000-000000000406','CHATBOT','Chatbot','Protected programme guidance follow-up.',35)
ON CONFLICT DO NOTHING;
INSERT INTO app_notification_events(id,catalog_id,event_key,display_name,description,rule_eligibility,is_enabled)
SELECT '00000000-0000-4000-8000-000000000234',id,'chatbot.case.created','Chatbot support case created',
  'Reference and authenticated staff link only. Recipients must have contextual case access.','CONFIGURABLE',true
FROM app_notification_catalogs WHERE catalog_key='CHATBOT' ON CONFLICT DO NOTHING;
