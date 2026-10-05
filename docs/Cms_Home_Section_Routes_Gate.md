# CMS Home section routes

Date: 2026-10-05

The later How it works, Who we support, and Additional Content additions are
recorded in `Cms_Home_Lists_And_Additional_Content_Gate.md`.

## Requested scope

Move the existing Home Page Banner and Action cards into dedicated paths under
an expandable Home Page sidebar container. Keep the existing overview and
banner together; do not add a separate Overview sidebar item.

## Result

- Home Page is an expandable sidebar container using the same shared navigation
  as Applicant and Operations. Its children are Home Page Banner at
  `/cms/home/banner` and Action cards at `/cms/home/action-cards`.
- Active section routes expand the container and identify the current child.
  Clicking the container on the collapsed icon rail expands the sidebar.
- Both paths compose Payload's native homepage editor, existing section previews,
  app form fields, draft/publish controls, validation, and permissions. Each
  editor renders only its own content fields and the existing Review Status.
- The native form state excludes other sections' stored values before user
  interaction. Validation and post-save form-state requests use Payload's
  section selection. Media drawer requests retain their complete native schema.
- The existing homepage global and saved field paths are retained. The editor
  submits a partial update; no database schema or data migration is needed.
  Review, drafts, and publishing continue to apply to the homepage as a whole.
- The combined global editor entry redirects to Banner. Unknown Home section
  paths return not found. Payload's version history keeps its native routes.
- Overview links use the canonical section paths. Hash-based navigation and
  scrolling between sections have been removed.

## Validation

- Focused tests: 20 files and 110 tests passed, including content access,
  canonical routing, native form-state scoping, media drawer isolation,
  previews, sidebar expansion, and shared portal navigation.
- Type checking: passed.
- Targeted lint: passed without warnings or errors.
- Architecture and form architecture: passed for 1,448 source files.
- File limits: passed for 2,125 handwritten files.
- Payload import map: regenerated successfully with the section edit view.
- Production build and Chromium: omitted as requested. No browser, deployment,
  or visual acceptance is claimed.

## Acceptance

Source validation is complete. User visual acceptance remains pending: expand
Home Page, open each child, edit and save a draft, and switch sections to confirm
that the other section's content remains intact. Preview and publishing remain
native homepage operations.
