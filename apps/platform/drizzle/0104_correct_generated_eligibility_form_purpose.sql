-- Earlier ruleset publication created linked verification forms before assigning
-- the dedicated eligibility purpose. Correct only those generated definitions.
UPDATE app_form_definitions AS definition
SET purpose = 'ELIGIBILITY_VERIFICATION',
    updated_at = now()
FROM app_form_versions AS version
JOIN app_eligibility_rule_set_verification_forms AS binding
  ON binding.form_version_id = version.id
WHERE version.form_definition_id = definition.id
  AND definition.purpose = 'OTHER'
  AND definition.code LIKE 'ELIGIBILITY_VERIFICATION\_%' ESCAPE '\';
