# Form field automatic keys

Date: 12 October 2026

## Change

The main Add/Edit field dialog no longer exposes the Field key input. Its React
Hook Form resolver uses the existing `uniqueStableKeyFromLabel` helper before
the existing Zod schema validates the field. New keys are generated from labels
and checked against all fields in the draft form, with numeric suffixes for
collisions. Editing a field preserves its stored key even when its label changes.

The editor now supplies the complete field list separately from the fields that
can be referenced by visibility conditions. Visibility choices retain their
existing ordering scope. The related editor body moved from the legacy
`components/admin/forms` folder to `modules/forms/ui/builder`, and its workspace
import was updated. No other editor behavior or database schema changed.

## Verification

The focused dialog and form-validation run passed: 2 files, 19 tests. Dialog
tests submit a new field whose label collides with an existing field outside
the visibility-choice list, and submit a renamed existing field while checking
that its original key remains unchanged. Both confirm the key input is absent.

Architecture, form architecture, component reuse, and file-size gates passed.
Type checking passed. Lint passed with 17 existing warnings and no errors.
`git diff --check` passed.

Written local acceptance: accepted for automatic key generation in the main
field dialog, based on the checks and automated submission tests above.

Browser acceptance is not claimed: the existing Chromium launch failure due to
missing `libnspr4.so` was established earlier in this session. No browser
installation, production build, deployment, or database migration was run.
