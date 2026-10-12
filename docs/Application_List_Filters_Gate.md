# Staff application list filters

Date: 2026-10-12

## Accepted implementation behavior

The staff application list has one filter panel and no status tabs. The panel
supports minimum/maximum applicant age, gender, business region, business sector,
application status, and submission start/end dates. Existing search and workflow
stage filters remain available. Applying or clearing filters resets pagination.

Age means completed years at submission. Date bounds include the whole selected
day in Namibia time. Invalid dates and reversed age/date ranges are rejected by
the shared Zod transport/form schema. React Hook Form manages editable values;
the existing query hook and client service send applied filters to the API.

Filtering stays in the repository's SQL query before counting and cursor
pagination. Existing all/assigned permission checks and SQL assignment scope
remain in force. Submission snapshots supply applicant date of birth and
business region/sector, with existing profile data used for applications without
a snapshot. Gender uses the submitted value when present, otherwise the current
applicant profile. Unknown demographic values do not match selected bounds or
gender values and remain visible when those filters are empty.

The user explicitly authorized adding gender to the applicant profile. Gender
is optional and is captured in new immutable submission snapshots. Historical
snapshots are not changed. Migration `0199_applicant_profile_gender` adds the
nullable column and allowed-value constraint.

## Architecture convergence

The filter schema lives in the applications API folder; staff filter UI remains
in the applications staff UI folder. The affected personal profile form and
fields moved from legacy components into profiles UI. The applicant profile
schema moved into profiles infrastructure. The old shared schema file retains
compatibility exports for existing imports; it no longer defines that table.
The distinct staff table/page names pass the component reuse check.

## Verification evidence

- Focused regression run: 62 tests passed across 11 files, covering filter UI,
  schema validation, client serialization, API transport, repository SQL
  construction, permission scope, profile routes, and submission regressions.
- Type checking passed.
- Repository lint passed with 27 existing warnings and no errors.
- Architecture, form architecture, and component reuse checks passed.
- File-size checks passed for 2,984 handwritten files.
- `git diff --check` passed.

## Acceptance scope

Source implementation is accepted on the evidence above. The migration has not
been applied to an application database. PostgreSQL execution of the new filters
and migration, authenticated browser interaction/appearance, and deployment
acceptance remain unverified. SQL construction assertions are not database
execution evidence. No production build or deployment was performed.
