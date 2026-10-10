ALTER TABLE app_chatbot_cases
  ADD COLUMN IF NOT EXISTS case_number integer GENERATED ALWAYS AS IDENTITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS app_chatbot_cases_case_number_unique
  ON app_chatbot_cases(case_number);
--> statement-breakpoint
UPDATE app_chatbot_turns t
SET response = jsonb_set(
  t.response,
  '{caseReference}',
  to_jsonb('SUP-' || lpad(c.case_number::text, greatest(6, length(c.case_number::text)), '0'))
)
FROM app_chatbot_cases c
WHERE c.id::text = t.response->>'caseId'
  AND t.response IS NOT NULL AND NOT (t.response ? 'caseReference');
--> statement-breakpoint
-- Turns without an existing support case keep a null public reference.
UPDATE app_chatbot_turns
SET response = jsonb_set(response, '{caseReference}', 'null'::jsonb)
WHERE response IS NOT NULL AND NOT (response ? 'caseReference');
