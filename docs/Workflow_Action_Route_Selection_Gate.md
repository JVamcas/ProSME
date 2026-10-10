# Workflow route destination selection

Date: 2026-10-10

The Return action's native single-select dropdown previously wrote a string
into `targetStageKeys` on blur, replacing the array written on change. Zod
then rejected saving with “expected array, received string”.

The focused workflow stage field now normalizes native single-select reads
to an array through React Hook Form registration. Clearing the selection
produces an empty array and the existing required-destination error. The
route schema and persisted array contract remain unchanged. The existing
multi-select control is reused for other actions. Extracting the field keeps
the route editor function within the mandatory 200-line limit.

Verification and acceptance:

- The new change-and-blur regression reproduced the reported error before
  the fix and passes after it.
- All 174 tests passed across 35 workflow definition and multi-select test
  files. The route editor tests cover new Return routes, changing a saved
  destination, empty selection, route identity, reopening, and terminal
  outcome editing.
- Full lint passed with zero errors and 23 existing warnings. Type checking
  passed.
- Architecture and form gates passed for 1,771 source files. File-size checks
  passed for 2,603 handwritten files. The touched functions are at most 170
  lines. `git diff --check` passed.

This record accepts the source change and local automated evidence. No
database migration is required. No production build, browser verification,
or GCP deployment was performed. The deployed application requires a rebuild
and redeployment to receive this fix.
