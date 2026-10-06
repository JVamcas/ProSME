# CMS Home lists and additional content

Date: 2026-10-05

## Requested behavior

Add How it works, Who we support, and Additional Content under the Home Page
sidebar container. Editors can add, remove, reorder, and edit process and
support cards. Arrange the editable lists in two columns on medium screens,
three on wide screens, and one on mobile.

## Implemented

- Added `/cms/home/how-it-works`, `/cms/home/who-we-support`, and
  `/cms/home/additional-content`, using the existing native Payload editor and
  shared sidebar. The Home guide links to all five sections.
- Process heading, introduction, and steps are editable. Removed the four-step
  minimum/maximum and the public projection that restored four default steps
  for any other list length. An empty saved list stays empty.
- Who we support now uses the homepage's `supportCards` array. Titles,
  descriptions, order, additions, and removals come from that array. The public
  section retains its scrolling presentation and hidden animation copy.
- Both card editors wrap Payload's native ArrayField, keeping its add, remove,
  duplicate, drag, read-only, validation, and row-state behavior. Inputs use the
  existing application form fields. Layout uses Tailwind utilities.
- Process and support previews use their public components and current native
  form rows. No custom client HTTP requests or Query provider are added.
- The CMS support preview renders each saved card once in a static Tailwind
  grid: one column on mobile, two on medium screens, three on wide screens.
  Animation copies remain confined to the public scrolling presentation.
- Additional Content edits only the existing impact/statistics banner: heading,
  introduction, background image, statistics and campaign message. Its live
  preview uses the same banner component as the public homepage. Other layout
  blocks retain their stored values and native paths without exposing their
  fields or generic block controls in this editor. The funding slogan and news
  introduction remain stored but are excluded from this section's submission.
- Unnamed group indices remain stable so Payload resolves the correct editor.
  Other sections' stored values remain excluded from the selected submission.
- Public support and content-block components move into the content module.
  Existing public page consumers use the module's block renderer.

## Database

- Forward-only migration `20261005_233000_home_support_cards` adds homepage and
  version support-card tables, initialized from existing published cards in
  saved order. Only `up` is provided; no backward migration is generated.
- Applied to the local database transactionally and recorded in
  `payload_migrations`: four homepage cards and 200 version-card rows.
  Eligibility content is not modified.
- Add, reorder, and remove-all storage checks passed in a transaction that was
  rolled back. The original four homepage cards remain intact.

## Validation and acceptance

- Focused tests: 22 files and 129 tests passed, including new route selection,
  list previews, order, additions, empty lists, variable process lengths,
  public support rendering, and native unnamed-group path stability.
- Type checking and targeted source lint passed.
- Architecture and form architecture passed for 1,455 source files.
- File limits passed for 2,132 handwritten files.
- Payload types and import map regenerated.
- Build and Chromium omitted as requested. No browser or deployment acceptance
  is claimed; visual acceptance remains with the user.

Support preview follow-up: all 13 focused list tests passed, including the
single-copy CMS grid and preservation of repeated saved entries. Architecture,
form architecture, file limits, targeted lint, and type checking passed again.

## Statistics editor and sidebar follow-up — 2026-10-06

- Home Page → Additional Content now labels the banner's editable array
  **Statistics**, shows expanded cards, and reuses the native card list for
  adding, removing, duplicating, and reordering values and labels.
- When the Home array is empty, **Edit displayed statistics** copies the
  programme statistics currently shown in the preview into Home's native form
  rows. Editors can change each value and label before saving or publishing.
  Opening the editor does not copy or save anything automatically. Saved
  custom rows are not overwritten. Clearing all rows retains the existing
  fallback to published programme statistics.
- The copy action respects read-only, disabled, loading, and error states.
  Existing homepage permissions, draft/publish controls, audit, and cache
  invalidation continue to handle persistence.
- The CMS sidebar uses the shared navy theme, including the existing dark
  workspace switcher and header variants.
- No database or stored-field changes are required. The Payload import map
  was regenerated for the new Home-only statistics field component.
- Focused verification: 4 files and 26 tests passed. Architecture, form
  architecture, file limits, and type checking passed. Full lint passed with
  14 existing warnings in unrelated files.
- Three reported test failures were reproduced against unchanged `HEAD` in
  an isolated temporary checkout: `home-funding`, `portal-navigation`, and
  `portal-shell`. Full-suite and production-build results are recorded below
  after completion. Authenticated browser and deployment acceptance remain
  pending.
