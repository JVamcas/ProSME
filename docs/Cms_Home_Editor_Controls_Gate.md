# CMS Home editor controls

Date: 2026-10-06

## Requested scope and result

Remove the redundant Review Status dropdown and Edit tab from the CMS Home
editor. All five Home section forms now expose their content fields and native
draft/publish state. Save draft and Publish remain the publication controls.
Versions and API remain available through Payload's existing tabs.

The homepage publish guard checks `cms.site-settings.publish` before recording
approval automatically for a Publish operation. Saving a draft does not approve
or publish it. Other CMS resources retain their existing approval behavior.
Stored review data and version history remain intact; this is an editor and
publishing-hook change without a database schema change or migration.

## Validation

- Focused tests: five files and 38 tests passed. Coverage includes every Home
  section, partial form state, native draft/publish actions, authorized direct
  publishing, denied and wrong-resource permissions, and Edit tab configuration.
- Architecture and form architecture: passed for 1,461 source files.
- File-size check: passed for 2,141 handwritten files.
- Full lint, full test suite, production build and type checking: pending.

## Acceptance

Implementation and focused source validation are complete. Full validation is
pending. Browser and user visual acceptance have not been performed. This record
does not claim final gate acceptance.
