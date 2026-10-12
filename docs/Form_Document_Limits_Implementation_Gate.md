# Document field page and file-size limits

Date: 2026-10-12

## Scope and behavior

Document fields expose optional `maxPages` and `maximumFileSizeMb` settings in
the existing React Hook Form/Zod builder. Page limits are positive integers;
file-size limits are whole MB from 1 to the existing 10 MB ceiling. Blank size
settings retain the 10 MB default. Blank page settings retain existing behavior.
Other field types cannot carry these settings.

A page-limited field accepts PDFs only. The applicant sees the accepted format,
file-size ceiling and page ceiling. The authorized, owner-scoped upload service
resolves the requirements from the application's pinned form version, checks
size/type/signature, and parses the PDF before creating a document version or
writing storage. Over-limit, unreadable and password-protected PDFs are rejected.
The parser is destroyed after each attempted read.

The existing PDF parser supports the required page-count operation through
[`getInfo().total`](https://github.com/mehmet-kozan/pdf-parse#getinfo--extract-metadata-and-document-information).
Its runtime assets are included in standalone tracing for the applicant upload
route. No dependency was added.

Migration `0202_form_document_limits.sql` adds nullable field settings with a
document-only constraint. Draft saving, version copying, runtime projections,
publication and standard seeding preserve them. Submission readiness reuses the
form repository's field projection to preserve the same settings.

The existing duplicate exported component name was clarified to
`ApplicantDocumentUploadPanel` for the query-backed applicant upload panel;
the separate application overview document component retains its name.

## Configuration and remaining activation work

Business Profile requires `maxPages: 12`; Pitch Deck requires `maxPages: 5`.
Neither document field is present in the repository's standard application form
seed. The relevant draft form must be configured, published and attached through
the existing versioning flow. Existing published forms and pinned applications
have not been rewritten. No file-size value was inferred for these two fields.

No GCP server access, migration application, production build, deployment or
browser acceptance was performed. The user explicitly prohibited direct GCP
server changes. The migration and application deployment remain required before
these settings can be used in the deployed platform.

## Local evidence

- Focused ESLint on every changed/new application configuration, source and test
  file: passed.
- `npm run typecheck --workspace @prosme/platform`: passed after implementation.
- `npm run check:architecture --workspace @prosme/platform`: architecture,
  form boundaries and component reuse passed.
- Changed-file TypeScript AST checks against the repository instructions:
  implementation files at most 600 lines, tests at most 400 lines, functions at
  most 200 lines: passed for 21 source/configuration/test files.
- `git diff --check`: passed.
- Document/form focused run: 40 tests passed across six files, including real
  installed-parser tests for 5/12-page acceptance and 6/13-page rejection,
  malformed PDFs, builder edits, schema validation, permissions, upload
  persistence and file-size enforcement.
- Repository/submission focused run: 27 tests passed across four files, covering
  document-limit SQL projections/writes and application readiness/submission.
- A broader initial run included `AttachedVersionRepositories.test.ts` and
  failed its funding-call attachment projection assertion: expected the form
  definition ID but received `workflow-definition`. That query and fixture are
  outside this change; this broader run is not recorded as passing.

## Acceptance

Local implementation checks passed as recorded above. Deployed behavior,
migration execution and user/browser acceptance remain unverified. This record
does not establish production acceptance.
