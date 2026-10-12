# News article editor and autosave

Date: 2026-10-12

## Scope

The News Article field retains its existing Lexical body and now has a visible
formatting toolbar and four native Payload layout blocks:

- Text beside an image, with left/right placement, formatted text, heading,
  caption, alternative text and an optional button.
- Two-column formatted text.
- Full-width image with caption and alternative text.
- Standalone button with a validated internal, HTTP/HTTPS or anchor destination.

Native Payload block controls add, edit and remove sections; its drag handles
reorder sections. Both live preview and the public article use
`NewsArticleContent`, including wider desktop sections, stacked mobile sections,
shared rich-text typography and the existing media/image and button components.
The CMS preview resolves selected media IDs. Existing paragraph and upload nodes
remain readable without converting article data.

Native Payload autosave uses a two-second debounce. Incomplete drafts are allowed;
publishing retains validation and the existing News publish permission. Save Draft
remains available. Payload provides saving and last-saved indicators and creates
the initial draft when opening a new article. The five-minute session policy is
unchanged.

Autosave requests are recorded as `autosaved` in the content audit rather than
being mislabelled as an unpublish when editing a published article.

## Database prerequisite

Apply registered Payload migration `20261012_170000_news_autosave` before using
the updated CMS. It adds the nullable `autosave` flag to `_cms_news_v`, leaving
existing article and version data intact. The migration is repeatable and has
a down operation. Layout sections remain in the existing body JSON and require
no additional layout tables. Payload types and the import map were regenerated.

## Local evidence

- Architecture boundaries, form architecture and component reuse checks passed.
- File-size check and TypeScript check passed.
- ESLint passed with existing repository warnings; focused lint passed.
- Six focused test files passed, containing 64 tests: layout rendering and link
  validation, legacy articles, News publishing and autosave permissions/audit,
  editor preview, public reads, media projection, and document actions.
- The broader content suite passed 493 tests across 57 files. Two subprocess
  fixture files initially hit sandbox `EPERM`; their 13 tests passed on rerun
  outside the sandbox. Startup tests use a mocked Docker executable.
- `git diff --check` passed.
- Disposable PostgreSQL checks passed: repeatable migration and rollback,
  incomplete initial draft creation, section image population through the actual
  article repository, published rendering, private autosaved changes, and
  publishing rejection for unsafe or incomplete standalone buttons.
- Test databases used a temporary cached PostgreSQL container with no persistent
  volumes, separate from application databases.

## Acceptance still required

The migration has not been applied to an application database. Browser acceptance
has not been performed: the existing Chromium executable cannot launch because
`libnspr4.so` is missing. No browser dependencies were installed.

Verify toolbar visibility, native add/edit/remove/reorder interactions, the sample
alternating text/image layout, mobile stacking, and preview/public parity. Verify
that new and existing articles save incomplete drafts, show saving status, recover
the latest saved draft after session expiry and sign-in, and retain the published
article until Publish is selected. Check save failure feedback with an expired
session or disconnected network.

Release acceptance remains pending these database and browser checks.
