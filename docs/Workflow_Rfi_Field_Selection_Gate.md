# Request information: scoped field selection

Date: 2026-10-03

## Implemented behavior

The workflow designer selects fields staff may unlock using labels from published
funding application forms. Staff choose a subset when sending each information
request. Runtime options are intersected with the applicant's pinned form version;
unknown fields cannot be opened. Documents use their existing separate request
flow. Business profile fields remain owned by the business profile.

Written clarification is an independent option. It no longer opens every configured
application field. A document-only request may have an empty field allowlist.
Automatic stage document requests open no application answer fields.

Applicant responses reuse the existing form renderer, including repeatable groups,
and the original field constraints. Server checks require the request recipient,
the current request version, every selected field, and no unselected fields.
Response submission and draft saves are denied after the deadline even when the
scheduled expiry has not yet run.

Submitting corrections merges only selected answers into the current application
response. The response, request continuation and before/after audit are written in
one transaction. Original submission snapshot content and its integrity hash are
preserved. This operation does not rewrite the business profile or original lodged
snapshot views.

New and edited action configuration uses close-request expiry. The existing
processor marks the request expired and resumes source-task SLA accounting at the
deadline; scheduler delay does not add applicant waiting time to the pause.
Existing stored published actions and existing requests are not mass-migrated.
Historical escalation and return expiry remain supported by the processor.

## Verification and acceptance

Local technical acceptance covers the field-selection, response-validation,
correction-persistence, and close-on-expiry behavior above. Repository-wide release
acceptance is withheld because unrelated checks are failing.

- Focused workflow/task UI and notification suites: 616 passed, 6 skipped.
- PostgreSQL RFI and deadline suites: 24 passed, including late-expiry accounting
  and exact preservation of the database deadline timestamp.
- Architecture and form boundaries: passed for 1,287 source files.
- File-size check: passed for 1,823 handwritten files before this record.
- ESLint on changed source and tests: passed.
- Type checking: passed after generated route types stabilized.
- Production build: passed; final run includes the database timestamp precision fix.
- Full default-suite run before the additional late-expiry test: 1,859 passed,
  126 skipped, 4 failed in untouched funding
  opportunity card/detail and workflow-stage public-status UI tests.
- Repository-wide lint: failed on six ref-access errors in the untouched
  `WorkflowGraphViewport.tsx`, with 17 warnings elsewhere.

Database checks use a disposable PostgreSQL 16 container with the complete migration
chain. No application database migration, deployment, live email delivery, or
browser acceptance is claimed.
