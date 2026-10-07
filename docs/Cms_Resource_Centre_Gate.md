# Resource Centre CMS implementation evidence

Date: 2026-10-06
Status: Implemented; editorial acceptance and container delivery remain open.

## Scope and behavior

- Resource Centre is the next CMS sidebar link immediately below About. It opens
  the existing native Payload collection at `/cms/collections/resources`.
- The collection supports resource name, title, description, Lexical rich text,
  document, and optional custom thumbnail. The unnamed editor group preserves
  existing document paths and native Payload validation, draft/publish controls,
  version history, and read-only behavior. Its inert preview reuses ResourceCard.
- Document selections accept DOC, DOCX, PDF, XLS, XLSX, JPEG and PNG. Media upload
  permission remains the existing canonical `cms.media.create` permission.
- New PDF and Office document uploads generate a PNG preview of their first page.
  Images use the original uploaded image. Generated previews use the existing
  media image-size processing and environment/CMS storage namespace. A custom
  resource thumbnail overrides the generated preview; clearing it restores the
  generated preview. Replacing an uploaded document generates a new preview.
- Generation runs inside the authenticated upload request and its database
  transaction. Generated media creation uses `overrideAccess: false`. The parent
  upload is restored after nested Payload upload operations. Failed conversion
  rejects the upload visibly instead of saving a missing preview.
- Office conversion uses an isolated temporary LibreOffice profile, followed by
  Poppler first-page rendering. Commands use argument arrays, bounded timeouts,
  and a private temporary directory that is removed on success and failure.
  See [LibreOffice PDF conversion](https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html)
  and [Poppler first-page image options](https://manpages.debian.org/unstable/poppler-utils/pdftoppm.1.en.html).
- Public listing queries request 12 records per page with database pagination,
  counts, stable date/creation/id ordering, narrow projections and bounded media
  population. Client controls navigate to the next server-rendered URL; there
  is no browser-side slicing of an unpaginated resource dataset.
- Resource detail queries filter by slug in the database, independently of list
  pages, and show rich text plus a document action. Uploaded documents take
  priority over preserved legacy external document links. Resources require a
  document/link to publish. Resource publish permission is required for approval.
- Public reads filter to published records. Draft preview requires the canonical
  `cms.resources.read` permission. Other CMS resource grants do not permit it.
- Resource sitemap entries use a dedicated published/indexable SQL projection.

## Migration

`20261006_170000_resource_centre` adds resource name/body to resources and version
storage, a generated thumbnail relation to media, and a public-pagination index.
Existing category labels are copied into resource names. Existing resource URLs,
custom thumbnails, file relations and version history are retained.

The migration was applied successfully to local PostgreSQL. No dev/production
migration or deployment was performed.

## Verification

- Architecture boundary and form-architecture checks: passed.
- Handwritten file-size check: passed.
- Lint: passed with 14 existing warnings and no errors.
- Type checking: passed.
- Focused content/authorization tests: 79 passed across 10 files. These cover
  pagination arguments/projections/order, detail lookup, draft filtering and
  permission mismatches, source validation, publish authorization, first-page
  command options and cleanup, nested upload permission/transaction handling,
  thumbnail replacement, inert/native editor behavior, sidebar ordering and
  server pagination navigation/boundaries.
- Full test run: 2,568 passed, 224 skipped, three failed. Existing failures are
  `home-funding.test.tsx`, `portal-navigation.test.ts`, and `portal-shell.test.tsx`.
  An initial run also exposed a Media field-order regression introduced here;
  preserving Alt/Caption order fixed it and the focused/full reruns confirm it.
- Production build: passed using `ENVIRONMENT=local scripts/container/build.sh`.
- Live PostgreSQL check: 31 published fixtures and one draft were created in a
  transaction and rolled back afterward. With one existing published resource,
  pages returned 12/12/8 distinct records; counts matched, the draft was hidden,
  and direct slug lookup worked independently of list pagination.
- HTTP checks against the temporary production build: `/resources` and the
  existing resource detail returned 200; `/resources?page=2` returned 404 with
  only one published resource, as expected.
- Real PDF/Office rendering check: pending completion of dependency installation
  in the isolated verification container.
- Browser check: blocked because the installed Chromium lacks `libnspr4.so`.
  Authenticated CMS editorial walkthrough and written user acceptance remain open.

## Delivery and limitations

The runtime Dockerfile installs Poppler, LibreOffice Writer/Calc and fonts.
Containers must be rebuilt to include the new code and rendering dependencies.
Native development outside Docker needs the same tools on PATH. Existing legacy
external document links remain usable; automatic previews are generated for new
uploaded files. Existing media documents can be re-uploaded to generate a preview.

This record is implementation/verification evidence, not editorial acceptance.

## Resource editor simplification (2026-10-06)

The Resource Centre form now hides Slug, Resource content, Published At, Review
Status, Review Notes, SEO Title, SEO Description and Exclude From Search, as
requested. These fields remain in the Payload schema to preserve stored data and
public URLs. New slugs still generate from the title, and the existing Save Draft
and Publish controls retain publishing permission checks and automatic approval.
Other collections retain their shared publishing and SEO controls.

Focused resource editor/publishing checks passed: 21 tests in three files.
Architecture, form architecture and file-size checks passed. Lint of all three
changed TypeScript files passed. Repository lint is blocked by two errors in the
unrelated `ClientWebsiteAnalyticsService.ts` work (`prefer-spread` and
`prefer-rest-params`), with 14 warnings elsewhere.
