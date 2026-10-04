# Reusable condition field source labels

Date: 3 October 2026

## Scoped change

Condition fields carry optional structured source segments, separate from their
stable operand keys and leaf labels. A single formatter renders
`[Application].ID`, `[Funding Call].title`, `[Eligibility].hard failure count`,
and `[Stage → Approval and Award Decision].[Task → Delegated Approval].Approve`.
Stage and Task names come from workflow configuration.

The shared condition builder applies the formatter to field selectors, selected
values, comparisons, calculated operands, and previews. Workflow route and Stage
conditions inherit that behavior. The runtime context selector and Eligibility
builder also use the same metadata and formatter. Fields without metadata keep
their existing label. Stored condition keys and evaluation behavior are unchanged.

## Verification

- Focused checks: 17 files and 95 tests passed; the workflow field catalogue was
  then rerun with the added action-source regression, passing all three tests.
- Architecture and form boundaries passed for 1,279 source files.
- File limits passed for 1,811 handwritten files.
- `git diff --check` passed.
- Lint and type checking: pending.
- Full test suite: pending; restarted with two workers because of heavy memory
  pressure on the shared machine.
- Production build: attempted, blocked by an active Next.js build holding the
  application's build lock. The other build was preserved.

## Acceptance

Scoped behavior is accepted by the targeted automated checks described above.
Full-repository validation is not yet accepted. No browser acceptance or
deployment is claimed. Existing unrelated workspace changes were preserved.
