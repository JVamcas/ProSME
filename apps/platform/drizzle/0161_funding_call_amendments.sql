ALTER TABLE app_funding_calls
  ADD COLUMN attachments_locked_at timestamp with time zone;
--> statement-breakpoint
UPDATE app_funding_calls call
SET attachments_locked_at = application.first_created_at
FROM (
  SELECT funding_opportunity_id, min(created_at) AS first_created_at
  FROM app_applications
  GROUP BY funding_opportunity_id
) application
WHERE call.id = application.funding_opportunity_id;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lock_funding_call_attachments_for_application()
RETURNS trigger AS $$
BEGIN
  -- Serialize with draft edits and lifecycle changes using the parent call row.
  UPDATE app_funding_calls
  SET attachments_locked_at = CURRENT_TIMESTAMP,
      row_version = row_version + 1
  WHERE id = NEW.funding_opportunity_id AND attachments_locked_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_application_lock_funding_call_attachments
BEFORE INSERT OR UPDATE OF funding_opportunity_id ON app_applications
FOR EACH ROW EXECUTE FUNCTION lock_funding_call_attachments_for_application();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_funding_call_attachments()
RETURNS trigger AS $$
BEGIN
  IF OLD.attachments_locked_at IS NOT NULL AND (
    NEW.attachments_locked_at IS DISTINCT FROM OLD.attachments_locked_at
    OR NEW.form_version_id IS DISTINCT FROM OLD.form_version_id
    OR NEW.eligibility_rule_set_version_id IS DISTINCT FROM OLD.eligibility_rule_set_version_id
    OR NEW.workflow_template_version_id IS DISTINCT FROM OLD.workflow_template_version_id
  ) THEN
    RAISE EXCEPTION 'Funding call configuration attachments are locked because applications have been created.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER app_funding_call_attachments_immutable
BEFORE UPDATE ON app_funding_calls
FOR EACH ROW EXECUTE FUNCTION protect_funding_call_attachments();
--> statement-breakpoint
ALTER TABLE app_funding_call_lifecycle_history
  DROP CONSTRAINT app_funding_call_lifecycle_command_check;
--> statement-breakpoint
ALTER TABLE app_funding_call_lifecycle_history
  ADD CONSTRAINT app_funding_call_lifecycle_command_check CHECK (command IN (
    'SUBMIT_FOR_APPROVAL', 'RETURN_FOR_AMENDMENT', 'WITHDRAW_APPROVAL_REQUEST',
    'APPROVE', 'PUBLISH', 'OPEN', 'SUSPEND', 'RESUME', 'CLOSE',
    'WITHDRAW', 'WITHDRAW_FOR_AMENDMENT', 'ARCHIVE'
  ));
--> statement-breakpoint
INSERT INTO app_capabilities (code, description) VALUES
  ('funding.call.submit.all', 'Submit any draft funding call for fresh approval after readiness checks.'),
  ('funding.call.return.all', 'Return any pending funding call to Draft with a reason.'),
  ('funding.call.withdraw-for-amendment.all', 'Withdraw any Approved, Scheduled, Live or Suspended funding call to Draft for amendment and fresh approval. Existing application workflows continue.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
-- Preserve existing submit and return authority as explicit grants.
WITH permission_mapping(old_code, new_code) AS (
  VALUES
    ('funding.call.create', 'funding.call.submit.all'),
    ('funding.call.edit-draft', 'funding.call.submit.all'),
    ('funding.call.approve.all', 'funding.call.return.all')
)
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT existing.role_id, replacement.id
FROM permission_mapping mapping
JOIN app_capabilities original ON original.code = mapping.old_code
JOIN app_role_capabilities existing ON existing.capability_id = original.id
JOIN app_capabilities replacement ON replacement.code = mapping.new_code
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
-- Amendment authority initially goes only to roles already able to withdraw and edit.
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT withdrawal.role_id, amendment.id
FROM app_role_capabilities withdrawal
JOIN app_capabilities withdraw_permission ON withdraw_permission.id = withdrawal.capability_id
JOIN app_role_capabilities editing ON editing.role_id = withdrawal.role_id
JOIN app_capabilities edit_permission ON edit_permission.id = editing.capability_id
CROSS JOIN app_capabilities amendment
WHERE withdraw_permission.code = 'funding.call.withdraw'
  AND edit_permission.code = 'funding.call.edit-draft'
  AND amendment.code = 'funding.call.withdraw-for-amendment.all'
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
UPDATE app_capabilities SET description = CASE code
  WHEN 'funding.call.create' THEN 'Create draft funding calls.'
  WHEN 'funding.call.edit-draft' THEN 'Edit draft funding calls without changing locked configuration attachments.'
  WHEN 'funding.call.approve.all' THEN 'Approve pending funding calls subject to maker-checker policy.'
END
WHERE code IN ('funding.call.create', 'funding.call.edit-draft', 'funding.call.approve.all');
