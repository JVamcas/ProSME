# CMS About editor

Date: 2026-10-06

## Requested scope

Add About directly below Home Page in the CMS sidebar. Make the main body
highlighted in the supplied public About screenshot editable as rich text.

## Result

- `/cms/about` resolves the existing Pages document with slug `about` and opens
  Payload's native editor. Resolution requires an active application user with
  both CMS access and the canonical Pages read permission before reading data.
- If About is absent, the native create editor requires Pages create permission
  and starts with the approved heading, introduction and rich-text paragraphs.
  Opening the route does not create or publish content.
- The About content group edits the heading, introduction and body content.
  The body uses Payload's Lexical rich-text editor with a
  fixed toolbar for headings, emphasis, lists and links.
- The Slug input is hidden for About. Its stored value and native creation
  default remain `about`; other Pages records retain their Slug input.
- Layout, Review Status, Review Notes and SEO controls are also hidden for
  About while their saved data remains intact. About uses the same direct
  draft/publish flow as Home: the existing Pages publish grant is still
  required, and authorized publishing records approval internally. Other
  Pages retain their review controls and approval requirement.
- About also hides the existing optional banner-image upload and omits the body
  helper text. Existing image data remains stored.
- About's breadcrumb reads `CMS / About the SME Fund`, using the current heading
  as its label. Native media drawers retain their own navigation context.
- The shared dark-sidebar Logout style overrides the button's navy text color
  so its label remains visible on the navy surface.
- The inert live preview reuses the public About content component and current
  native form values. Native read-only controls, drafts, approval records,
  publishing permissions, auditing, revalidation and version history remain.
- Other Pages records use the ordinary native group without an About preview.
  The unnamed group retains `title`, `summary`, `content` and `featuredImage`
  at their existing persisted paths. No database migration is required.
- The public page header moved into the owning content module; consumers have
  updated imports. The existing paragraph-to-rich-text helper is reused by
  seeding and the About creation defaults.
- Payload collection button slots use the existing platform draft/publish
  controls. A small type fix preserves the existing Home review-field hiding
  behavior while satisfying the compiler's discriminated field types.

## Validation

- Latest CMS/content suite after editor cleanup: 26 files and 185 tests passed,
  including denied and authorized direct About publishing and unchanged review
  approval requirements for other Pages.
- Initial focused rerun after configuration fixes: 7 files and 73 tests passed,
  including About authorization, narrow draft lookup, native defaults, real
  rich-text rendering, sidebar order, routing and existing publishing controls.
- Initial full suite: 2,515 passed, 224 skipped and three failed. The failures are
  `home-funding.test.tsx`, `portal-navigation.test.ts` and `portal-shell.test.tsx`,
  matching previously recorded failures outside this change.
- Type checking: passed after the latest editor cleanup.
- Repository lint: zero errors and 14 warnings in existing unrelated files.
  Focused lint for the new implementation and affected configuration: passed.
- Architecture and form architecture: passed for 1,467 source files.
- File-size limits: passed for 2,149 handwritten files.
- Payload import map regenerated successfully.
- Latest production build: passed with `ENVIRONMENT=local scripts/container/build.sh`,
  including Next.js compilation, type checking and page generation using the
  repository's build-time CMS fallbacks.
- Browser verification: blocked because Chromium cannot load `libnspr4.so`.

## Acceptance

Implementation was authorized by the user. Visual acceptance and live
save-draft/preview/publish checks remain pending. No deployment or live
publication is claimed.
