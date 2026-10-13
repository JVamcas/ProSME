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

## 2026-10-13: allowed file types and WorkflowHub comparison

The Document limits section now includes the existing shared multi-select control
labelled **Allowed file types**. Choices are PDF, DOCX, XLS, XLSX, TXT, CSV, JPG,
JPEG and PNG. The configuration is persisted with the field, copied with form
versions and projected into upload requirements. Unconfigured existing fields
retain their previous PDF/DOCX/JPEG/PNG selection; the added formats require an
explicit selection. Empty, duplicate or unsupported selections are rejected.

Setting a page limit selects PDF automatically and disables other format choices.
API validation and the database constraint also require PDF-only configuration
when a page limit exists. Upload validation checks the configured extension,
MIME type and content signature before creating a version or storing a file.
Spreadsheet archive checks distinguish Word and Excel directories; XLS checks
the compound-file header and workbook stream name. TXT/CSV content must be
UTF-8 text without binary control characters. CSV browser MIME variants and
generic/absent MIME types are accepted subject to the selected extension and
content checks. These checks identify file formats; they do not fully validate
every internal archive or workbook structure.

Migration `0203_form_document_file_types.sql` adds nullable `accepted_extensions`
and a document-only supported-format constraint. No database migration or GCP
server changes were performed.

### WorkflowHub source review

Reviewed local code under `/home/pkambala/Namport/WorkflowHub`:

- `frontend/features/forms/components/FieldBehaviourDialog.tsx`: validation
  condition, visibility, editability and conditional requirement controls;
  numeric fields also expose calculations.
- `frontend/features/forms/components/RuleSettingsEditor.tsx`: custom validation
  message, draft-save/submission/both modes and behavior for missing rule inputs.
- `frontend/features/forms/runtime/behaviour.ts` and
  `backend/src/WorkflowHub.Application/Features/Forms/Services/FormBehaviour.cs`:
  the runtime evaluates visibility, editability, required conditions and
  validation rules in both frontend and backend.

| Capability | Current SME platform | WorkflowHub |
| --- | --- | --- |
| Field/section visibility conditions | Implemented | Implemented |
| Required flag | Implemented | Implemented |
| Numeric and text-length bounds | Implemented | Implemented |
| Document pages, size and allowed formats | Implemented locally | Not compared as a document upload capability |
| Conditional editability | Implemented locally | Implemented |
| Conditional requirement | Implemented locally | Implemented |
| Arbitrary validation condition with custom message | Implemented locally | Implemented |
| Validation on draft save, submission or both | Implemented locally | Implemented |
| Configurable handling of missing validation inputs | Implemented locally | Implemented |

The additional rule controls and their runtime enforcement are now implemented.
See [the field rules implementation record](Form_Field_Rules_Implementation_Gate.md)
for scope, server enforcement and final local verification.

### Extension checks

- 59 focused tests passed in nine files, including selector interaction,
  PDF-only locking, schema validation, SQL projections/writes, format signatures,
  and allowed/disallowed owner-scoped uploads.
- Focused ESLint passed for all changed/new source and test files.
- Full platform TypeScript checking passed.
- Architecture, form-boundary and component-reuse checks passed.
- Changed-file limits passed for 19 files against the required 600/400-line file
  limits and 200-line function limit.
- `git diff --check` passed.
- Browser/deployed acceptance and migration execution remain unverified.
