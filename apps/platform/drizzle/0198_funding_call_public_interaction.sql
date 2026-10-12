ALTER TABLE app_funding_calls
  ADD COLUMN IF NOT EXISTS public_interaction_enabled boolean NOT NULL DEFAULT true;
--> statement-breakpoint
INSERT INTO app_capabilities(code, description) VALUES
  ('funding.call.public-interaction.enable.all', 'Enable public viewing, eligibility self-checks and application intake for any funding call, subject to lifecycle and dates.'),
  ('funding.call.public-interaction.disable.all', 'Disable public viewing, eligibility self-checks and new application intake for any funding call. Existing submitted workflows continue.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
-- Preserve existing intake-control authority through explicit contextual grants.
WITH mapping(old_code, new_code) AS (
  VALUES
    ('funding.call.resume', 'funding.call.public-interaction.enable.all'),
    ('funding.call.suspend', 'funding.call.public-interaction.disable.all')
)
INSERT INTO app_role_capabilities(role_id, capability_id)
SELECT existing.role_id, replacement.id
FROM mapping
JOIN app_capabilities original ON original.code = mapping.old_code
JOIN app_role_capabilities existing ON existing.capability_id = original.id
JOIN app_capabilities replacement ON replacement.code = mapping.new_code
ON CONFLICT (role_id, capability_id) DO NOTHING;
