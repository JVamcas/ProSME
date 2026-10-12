# Configurable checkbox field

Date: 12 October 2026

## Scope

`CHECKBOX` is a generic dynamic form field type available in the main field
selector and repeatable item fields. Labels, help text, stable keys, visibility,
width, and the Required setting come from the saved definition. No COI-specific
field key, agreement text, or mandatory acknowledgement was added.

When Required is enabled, completed form validation requires the boolean value
`true`. Optional checkboxes may be absent or false. Draft validation permits
unchecked values. Existing required Yes/No fields continue to accept false.
The same value schema drives shared server validation and completeness.

The renderer reuses the shared CheckboxField control, emits true/false, displays
configured text and errors, and disables changes in read-only views. Required
checkboxes are never automatically checked from the schema's `const` validation
rule. Checkbox labels support up to 1,000 characters and use a multiline editor;
other field labels retain their 160-character limit. Checkbox values are exposed
as booleans to form/workflow conditions and eligibility source projections.

Migration `0200_form_checkbox_field.sql`, registered in the Drizzle journal,
extends the application field-type constraint while preserving existing types.
The migration does not modify existing form definitions, published versions,
COI declarations, or workflow document requirements. COI submission's existing
handling of additional dynamic answers is outside this change.

## Verification

- Architecture, form architecture, and component reuse checks passed for 2,054
  source files.
- Focused tests passed: 10 files, 62 tests. Coverage includes builder selection,
  long configurable labels, required/optional/draft validation, unchanged Yes/No
  semantics, completeness, initial unchecked state, checked/read-only rendering,
  real component change/submission events, conditions, and repeatable items.
- File-size checks and type checking passed. Lint passed with 17 existing
  warnings and no errors.
- `git diff --check` passed.

## Acceptance limits

Written local acceptance: accepted for generic checkbox configuration and
shared dynamic form rendering/validation based on the automated evidence.
Database and browser acceptance remain open as described below.

The migration has not been applied to the configured database. An isolated
PostgreSQL migration check could not start because the installed PostgreSQL
client tools do not include `initdb`. No server was installed and no application
records were changed. Saving new checkbox fields requires applying migration
0200 in the target database.

Browser visual acceptance remains open under the previously verified Chromium
launch failure caused by missing `libnspr4.so`. No browser dependency was
installed, and no production build or deployment was run.
