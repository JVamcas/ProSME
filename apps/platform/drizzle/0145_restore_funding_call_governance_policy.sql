INSERT INTO "app_funding_call_governance_policy"
  ("id", "allow_submitter_withdrawal", "enforce_maker_checker")
VALUES (1, true, true)
ON CONFLICT ("id") DO NOTHING;
