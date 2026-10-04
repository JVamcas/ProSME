# Notification template subject editing

Date: 2026-10-03

## Scope and acceptance

Version history includes an Edit action and an Email subject column. The edit
form preloads the selected subject and uses React Hook Form with the shared Zod
transport schema. Saving creates a new immutable draft; publication remains an
explicit action using the existing publication permission.

The server requires the canonical template import permission because this
operation creates a version. It validates the channel/target and target/version
relationships before using the source content. Subject length, required text,
newlines and permitted placeholders are validated. The existing HTML, plain text,
source filename and HTML hash are retained. Version allocation and its audit entry
reuse the existing transactional repository operation, with the source version
recorded in audit metadata.

The client request and cache invalidation follow the domain client service and
TanStack Query hook flow. No schema migration or dependency changes are required.
The version lookup now explicitly declares its possible missing-record result.

The reported delivery-history build error is fixed with a checked status-label
lookup that accepts the transport string and supplies an unknown-status fallback.
Known labels and prototype-like unknown values are covered by tests. Incomplete
new test fixtures were filled in; the workflow-stage test fixture includes its
required allowedActions property and exposes its controller after render.

Scoped implementation acceptance: subject edits retain email bodies and previous
versions, require authorization, produce audited drafts and preserve the existing
publication lifecycle. This is code and automated-test acceptance; deployment,
real email delivery and user acceptance are not claimed.

## Validation evidence

- Initial focused edit validation: 20 tests passed across service, protected-route
  and UI interaction tests.
- Initial notification suite: 163 tests passed across 29 files.
- Final type checking: `npm run typecheck` passed.
- Final architecture and form architecture checks passed for 1,260 source files.
- Final file-size check passed for 1,772 handwritten files.
- Final lint passed with 17 existing warnings and zero errors.
- Final full suite (`npm run test --workspace @prosme/platform -- --maxWorkers=4`):
  1,711 passed, 115 skipped, two failed; 449 files passed, 32 skipped, one failed.
  Both failures are in the untouched funding-opportunity card tests: outdated
  closing-date text and a text-based lookup for an icon-only save button.
  New template editing and delivery-message tests passed in this run.
- Production build (`npm run build`) passed: compilation, TypeScript, all
  84 static pages and build trace collection completed with exit code zero.
- `git diff --check` passed.

Repository-wide test acceptance remains blocked by the two unrelated card tests.
No claim of a fully green repository test gate is made.
