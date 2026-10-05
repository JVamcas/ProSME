# CMS editor controls, preview redirects, and navigation

Date: 2026-10-05

## Requested changes

Remove Review Notes from the Home editor, use the app's form controls for Review
Status and other fields, fix Preview opening an unreachable site, reduce the
image editor's size and apply the app's brand styling, and fix the duplicate
CMS sidebar/header when navigating to CMS.

## Implementation

- Home hides Review Notes while preserving existing stored notes and version
  history. Other content editors retain their existing review fields.
- Banner text uses `FormInput`; paragraph fields use `FormTextarea`; Review
  Status uses `FormSelect`. Payload continues to own values, validation,
  conditions, read-only permissions, drafts, and publishing.
- Media Alt and Caption reuse the same adapters. Save uses the app's existing
  button and Payload's native submission, with the save shortcut, permission
  checks, processing states, and upload blocking preserved.
- The media document editor is a full-height drawer attached to the right edge,
  limited to 42rem on desktop and the viewport width on mobile. Its content
  scrolls within the available height. Styling
  uses the app's orange, navy, gold, and white; close controls, focus trapping,
  upload tools, and image variants remain owned by Payload.
- Preview and Exit Preview send relative redirect locations. This keeps the
  browser on its current public origin when the server's request URL contains
  an internal container address. Preview still requires the appropriate
  canonical CMS read permission before enabling draft mode.
- Home renders dashboard content inside Payload's existing default template.
  Removing its additional template prevents duplicate navigation and headers.
- Workspace switcher text uses the same explicit 12px size in CMS, Applicant,
  and Operations; Payload's smaller root font no longer shrinks it.
- The generated import map registers the field adapters and media Save button.
  Persisted field names and schema are unchanged; no migration is required.
- CMS layout, shell, and native media drawer styling use Tailwind utilities in
  `CmsAdminTheme.ts`. `custom.scss` is removed. `tailwind.css` only loads Tailwind
  utilities and shared brand themes; it contains no handwritten overrides.
- Sidebar resizing updates one runtime CSS variable consumed by Tailwind;
  the custom stylesheet previously injected by the sidebar is removed.

## Validation

- Architecture and form architecture passed for 1,436 source files.
- File-size checks passed for 2,108 handwritten files.
- Type checking passed.
- Focused content and preview tests: 16 files, 83 tests passed.
- Full lint passed with no errors and 14 existing warnings.
- Compiled SCSS contains the scoped media drawer dimensions and brand tokens.
- Right drawer follow-up: SCSS compilation passed; no build or browser run.
- Tailwind follow-up: compiled utilities verified for the media drawer and
  navigation, including escaped native selectors and important overrides.
  Focused navigation and brand tests: 2 files, 10 tests passed. Architecture and
  form architecture passed for 1,437 source files.
- Full test suite, production build, and a later lint rerun were stopped at
  the user's request. No completed full-suite or build result is claimed.

## Review and delivery

The user requested no build or Chromium checks and will perform visual review.
An earlier Chromium launch failed because `libnspr4.so` is unavailable. No
browser acceptance is claimed.

Docker was not rebuilt or deployed. Docker status inspection was blocked by
permission denied on `/var/run/docker.sock`. Source validation and deployment
remain separate. This record does not claim the wider CMS phase is accepted.
