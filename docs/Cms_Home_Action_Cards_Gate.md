# CMS Home action cards

Date: 2026-10-05

## Requested scope

Expose the three cards beneath the Home Page Banner in CMS: funding,
eligibility, and application tracking.

## Implemented behavior

- The Home overview lists **Action cards** after **Home Page Banner**.
  Its edit link opens `/cms/home/action-cards`.
- The homepage editor exposes each card's existing title and description,
  grouped by card. Later Home sections remain hidden.
- The preview uses the public `HomeActions` component and updates from Payload's
  current form fields. The preview is inert; Payload retains ownership of field
  state, validation, read-only controls, saving, drafts, and publishing.
- The three destinations remain `/funding`, `/eligibility`, and `/portal`.
  Icons, colours, order, and layout retain the existing public presentation.
- Existing `actionCards.*` saved paths are preserved. The surrounding editor
  groups are unnamed, so no database schema or data migration is required.
- The existing CMS update permission and publishing guards protect writes.
  Readers see the section in the overview without an edit link.
- `HomeActions` moves into the content module's public UI. The banner and cards
  reuse one section editor shell and anchor header.

## Original action-card validation

The route migration is recorded in `Cms_Home_Section_Routes_Gate.md`. The
evidence below belongs to the original action-card editor change.

- Architecture and form architecture: passed for 1,444 source files after the
  concurrent changes appeared.
- File-size check: passed for 2,119 handwritten files.
- Focused tests: 6 files and 30 tests passed, including CMS access controls,
  field paths, section visibility, preview updates, defaults, and read-only UI.
- Type checking: passed.
- Lint: passed with 14 existing warnings and no errors.
- Payload import map: generated successfully with the new editor component.
- Full tests: 569 files passed, 51 skipped, and 1 failed; 2,426 tests passed,
  224 skipped, and 3 failed.
- All three failures are in `ResponsiveCmsMedia.test.tsx`, where the media hook
  reads `req.file` from a test invocation without `req`. Separate media-migration
  edits appeared in the
  shared workspace during this task, including changes to `CmsMediaStorage.ts`.
  Those edits are outside the action-card scope and are preserved untouched.
- Production build: compilation passed; remaining checks pending.
- Browser launch: blocked by the missing `libnspr4.so` Chromium dependency.
  No automated visual acceptance is claimed.

## Acceptance and delivery

Review `/cms`, then open **Action cards**. Edit each title and description,
check the live preview, save a draft, and compare the public draft preview.
Publish and check that the public cards display the saved content. Check a
narrow screen and confirm the three card destinations.

Visual acceptance remains pending the user's review. No Docker rebuild or
deployment is claimed.
