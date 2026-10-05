# CMS workspace switcher and Home banner editor

Date: 2026-10-05

## Requested scope

Fix the workspace switcher first, use Tailwind for custom CMS styling, and add
the Home Page Banner as one grouped editor. Further Home sections wait for the
user's visual review.

## Implemented behavior

- Only the current workspace receives a selected background. Operations is
  selected on `/admin`; CMS is selected on `/cms`. Unavailable workspaces retain
  their disabled state and are not links.
- Payload's layout loads Tailwind utilities and the same brand theme as the
  app. Utilities take precedence when explicitly applied to custom components;
  Tailwind Preflight is omitted to preserve Payload's native editor styles.
- Custom Home overview, image preview, logout feedback, and
  banner editor styling use Tailwind. Existing shared app navigation components
  are reused. The remaining SCSS adapts Payload's native shell and controls.
- Home shows only the Banner entry. The editor groups the headline, introduction,
  image, campaign slogan, quote, button captions, and benefits under Home Page
  Banner. Later Home fields are hidden in this editing increment.
- The live preview uses the same `HomeHero` component as the public Home page.
  Container queries allow its desktop/mobile layout to follow the available
  preview width. Editing text updates the preview; selecting or clearing media
  updates the image without showing a stale response for another selection.
- Payload owns field state, validation, read-only controls, saving, drafts, and
  publishing. Existing server permission and publishing guards remain in place.
- Both new groups are unnamed. Persisted field names and existing content remain
  unchanged; no database migration is required. Payload's import map is updated.

## Validation

- Architecture and form architecture: passed for 1,433 source files.
- File-size check: passed for 2,100 handwritten files.
- Type checking: passed before the production build.
- Focused tests: 6 files, 21 tests passed.
- Lint: passed with 14 existing warnings and no errors.
- Compiled CMS stylesheet: verified brand colours, workspace grid, responsive
  banner queries, utility priority, and absence of Preflight.
- Full tests: 565 files passed and 51 skipped; 2,393 tests passed and 224 skipped.
- Production build: `ENVIRONMENT=local scripts/container/build.sh` passed,
  including webpack compilation, TypeScript, page generation, and build traces.
  Compilation reported warnings; no build error occurred.

## Visual review and delivery

The user will perform visual tests. Automated Chromium verification could not
launch because `libnspr4.so` is missing. No visual acceptance is claimed.

Suggested review: check selection on `/admin` and `/cms`, then open
`/cms/globals/homepage#home-page-banner`. Change the banner text and selected
image, check the preview, save a draft, and compare the public draft preview.
Check the narrow layout as well as desktop.

No Docker rebuild or deployment was performed. The production build is a source
validation step. Work stops at this banner until the user accepts it.

Implementation and automated checks are complete. Visual acceptance remains
pending the user's review; the wider CMS gate is not claimed as accepted.

## CMS entry-point and sidebar follow-up

- `/cms` renders the Home overview using Payload's dashboard view replacement.
  The previous dashboard content and its entry card are removed.
- `/cms/home` redirects to `/cms`; the Home Page sidebar link targets `/cms`.
- `CmsPageHeader` reuses the shared application `PageHeader` and applies the
  compact orange eyebrow and navy title presentation for custom CMS pages.
- The CMS sidebar uses canonical brand gold with navy text and icons.
- Follow-up validation is in progress; the earlier evidence above applies to
  the initial banner increment.
