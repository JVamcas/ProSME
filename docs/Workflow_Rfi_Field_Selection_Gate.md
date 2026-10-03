# Request information: scoped field selection

Date: 2026-10-03

## Implemented behavior

Staff select the application answer fields to unlock when sending each information
request. Choices come directly from the application's pinned form version; there
is no stage-level field allowlist. Existing stored action field lists are ignored
for runtime selection and cleared when an action is saved in the designer.
Unknown fields cannot be opened. Documents use their existing separate request
flow. Business profile fields remain owned by the business profile.

Written clarification is an independent option. Selecting it does not open any
application answer fields. A document-only request may select no answer fields.
Automatic stage document requests open no application answer fields.

Applicant instructions replace the separate Reason control for information
requests. Runtime validation ignores legacy reason-required flags for this action;
other action types retain their configured reason requirements.

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

## Prior verification and acceptance

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

## Runtime selection correction verification

The previous stage allowlist design has been replaced with runtime selection as
specified above. Scope includes removal of the Reason control, legacy reason
validation compatibility, runtime field projection and designer configuration.

Local technical acceptance: accepted for the runtime selection correction.

- Changed workflow policies, availability, form validation and dialog suites:
  45 tests passed across six files.
- PostgreSQL RFI suite: eight tests passed against a migrated disposable database,
  including runtime field discovery and exclusion of business/document fields.
- Changed-files ESLint, type checking, architecture/form boundaries, file-size
  check and production build: passed.
- Repository-wide lint: still fails on six pre-existing ref-access errors in
  `WorkflowGraphViewport.tsx`; 17 warnings remain. Release acceptance stays withheld.

The broader workflow run passed 575 tests but initially failed the old designer
round-trip expectation for stage field lists. That expectation was updated for
runtime selection and the affected suite passed in the final six-file run.
No deployment, live database changes or browser acceptance is claimed.
