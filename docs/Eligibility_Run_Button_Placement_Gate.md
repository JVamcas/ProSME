# Eligibility execution button placement

Date: 3 October 2026

## Scoped change

The bound task form's eligibility execution button appears at the right of the
lower Workflow actions bar. The form retains its draft persistence status,
retry-save control, errors, and evaluation results. A React portal preserves
the existing form controller, answer validation, mutation, and rerun behavior.
Standalone form rendering retains its existing button placement.

## Verification

- Targeted regression tests: three files, 19 tests passed. Coverage includes
  execution from the lower actions bar for draft and completed form responses,
  absence of a duplicate button inside the form, and unchanged mutation input.
- Architecture and form boundaries: passed for 1,260 source files.
- File-size gate: passed for 1,772 handwritten files.
- Lint: passed with 17 existing warnings and no errors.
- `git diff --check`: passed.

## Acceptance

Scoped placement and execution behavior are accepted by the targeted automated
checks above. Full-suite, type-check, and production-build results are pending.
No browser acceptance or deployment is claimed. Existing workspace changes
were preserved.
