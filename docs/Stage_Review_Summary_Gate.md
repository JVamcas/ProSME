# Stage review summary — local acceptance

## Scope

- Added an explicit `COMMENT` form field, using the shared textarea renderer,
  builder controls, server validation, length limits, and condition field mappings.
- Form-backed stage comments select only `COMMENT` fields. Legacy task comment
  fields and criterion comments remain explicit comment sources. Ordinary textarea
  answers are excluded. Future legacy-to-form conversions create Comment fields
  for known comment sources without changing existing snapshots.
- Stage averages read the saved server-calculated aggregate from each eligible
  completed response. The exact response snapshot determines its scale. Raw
  points remain points; percentage-normalized results retain their percentage
  scale, including sums whose maximum exceeds 100.
- Legacy scoring uses its configured sum/average/weighted method on its original
  scale. Missing aggregates are not replaced with an average of standalone scores.
- The screen and CSV share score formatting. Reviews on incompatible scales have
  no combined average. Workflow publication rejects missing or multiple scoring
  aggregates so each scoring form has one result to average.
- Latest-run, conflict-of-interest, completion, supersession and peer-release
  restrictions remain in the existing repository evidence scope.

## Database and compatibility

Migration `0213_form_comment_field.sql` extends the field-type and text-length
constraints. It is registered in the migration journal and was applied twice in
an isolated PostgreSQL test transaction. It does not rewrite existing fields,
published versions, responses or application data.

Existing textarea fields remain textarea fields. To include their future answers
in the stage summary, change the intended fields to Comment in a new draft and
publish/bind the appropriate new versions. Historical form responses are read
using their saved field types. This change does not migrate historical answers.

## Verification

- Focused unit/component regression suites: 59 tests passed across 11 files,
  including Comment creation/rendering/validation, form parsing and visibility,
  scoring, conversion, publication validation and stage score display.
- Lint passed with 20 existing warnings and no errors. React changes reuse the
  existing controlled builder inputs, textarea widget and table; no new data
  fetching or rendering of raw HTML was introduced.

- PostgreSQL repository regression suites: 25 tests passed against a disposable
  local PostgreSQL 16 container. Coverage includes all four aggregation methods
  with raw and percentage normalization, equal reviewer averaging, missing and
  incomplete aggregates, available-source rules, incompatible scales, pagination,
  latest-run selection, visibility, CSV output, Comment selection and migration
  repeatability.
- Type checking passed with a 3072 MB Node heap after correcting a test fixture.
  The first attempt at 1536 MB exhausted its heap.
- Architecture, form-boundary and component-reuse checks passed.
- The repository file-size check remains blocked by five untouched files:
  `FormRepository.ts`, `FormDraftSyncPostgres.test.ts`,
  `WorkflowTemplateDeletionPostgres.test.ts`,
  `ServerApplicationDocumentService.test.ts`, and `ServerFormsService.test.ts`.
  Files added by this change are within the configured limits.

Acceptance is limited to local source and regression evidence. No production
build, deployment, live database migration or browser acceptance is claimed.
