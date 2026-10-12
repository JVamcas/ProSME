# COI dynamic form answer capture

Date: 12 October 2026

## Behavior

COI declarations now submit the complete dynamic answer object, the exact form
version, and the expected task row version. The UI no longer selects only the
conflict and disclosure fields. The API rejects the previous decision-only
payload so it cannot bypass the configured signature, checkbox, or other fields.

The backend verifies process permission, current assignment, task status,
declaration state, row version, and the stage-bound form version before reading
the form. It reuses the shared form capture, visibility, sanitization, and
completed-value validation functions. Required and optional field rules come
from the published form. Unknown field keys are rejected; stale hidden answers
are excluded using the normal dynamic-form visibility behavior. Explicit false
and zero values remain intact.

The existing COI outcome contract (`HAS_CONFLICT` and `DISCLOSURE_TEXT`) still
determines clearance and disclosure routing, now on the server. Additional
answers are captured generically without special signature/acknowledgement keys.

The transaction rechecks the bound version, assignment, state, and row version
under locks, then writes clearance and a COI event containing the answers and
the full form-definition snapshot. Repeat declaration submissions are rejected;
independent review events retain the original declaration event. The review
detail projection reads the declaration snapshot and answers for the exact
subject and form version. The existing review drawer renders them read-only
through the shared form renderer. Legacy events retain their disclosure-only
display because their other answers cannot be reconstructed.

## Verification

- Architecture, form architecture, and component reuse checks passed for 2,055
  source files.
- File-size checks passed; service tests were split into focused declaration
  coverage with a shared fixture rather than exceeding the gate's 300-line limit.
- Lint passed with 17 existing warnings and no errors.
- Focused Vitest run: 9 files, 52 tests passed. Coverage includes the complete UI
  payload, protected route validation, server field validation, missing signature,
  unchecked required checkbox, unknown keys, permission denial, version mismatch,
  full answer/snapshot persistence projection, transaction-context mismatches,
  scoped review reads, legacy clearance behavior, and configurable checkbox rules.
- Type checking passed.
- `git diff --check` passed.

## Acceptance limits

Written local acceptance: accepted for full configured answer capture,
server-side validation, transactional event persistence, and scoped read-only
review rendering based on the automated evidence above. Live database and
browser acceptance remain open.

Migration `0201_coi_form_answers.sql` adds answer and definition-snapshot JSON
columns and validates snapshot/version consistency. It is registered in the
Drizzle journal. It has not been applied to the configured database or verified
against a disposable PostgreSQL server, because local server executables are
unavailable. Migration 0200 is also needed for the previously added checkbox type.
Deploying this code requires the corresponding migrations.

Browser and live database acceptance remain open. The installed Chromium cannot
load `libnspr4.so`, as established earlier in this session. No dependencies were
installed, no production build or deployment was run, and no live applicant or
reviewer records were changed. Published forms and workflow versions were not
modified. The Technical Assessment upload requirement was not changed by this
answer-capture task.
