# Knowledge table upload and funding visibility evidence

Date: 2026-10-12

The existing knowledge table toolbar now owns Activate, Deactivate and the
permission-gated Upload document control. Funding rows previously sorted after
FAQ rows because pagination ordered resource keys alphabetically. The SQL
projection now orders funding calls first, then eligibility, documents, FAQs and
contact details, with stable resource-key ordering within each type. Filtering,
pagination and totals remain in SQL; table rows contain metadata only.

The upload control accepts PDF, DOCX and UTF-8 TXT documents up to 5 MiB. Uploads
extract readable text, save the original using existing document storage, and
atomically create document metadata, upload audit and inactive activation state.
Failed persistence attempts remove the stored file. Text extraction is bounded
to 100 PDF pages, 200,000 text characters and 20 MiB unpacked DOCX content.
Image-only scans require a text layer; OCR is not included.

Uploaded documents open in the existing drawer with a readable text preview.
The preview explains that activation makes the text available to website visitors
and chatbot answers. Staff can reopen it from the document's table row. Upload
does not activate content or create another release approval process. Published
funding calls, approved FAQs and exact-bound eligibility continue to synchronize
from their existing modules without duplicate uploads.

## Permissions and data boundary

Upload requires both `chatbot.knowledge.read.all` and the new canonical
`chatbot.knowledge.document.upload.all` permission before reading request bytes
or writing storage. Migration `0197_chatbot_knowledge_documents.sql` registers the
permission and grants it initially only to the system administrator role.
Existing activation/deactivation permissions control publication. Chatbot Support
does not receive document upload or activation permissions.

Inactive text is available only through the protected staff preview. Active text
is chunked into the existing immutable, verified knowledge artifacts with public
source citations. The public citation endpoint returns plain text with no caching
and checks current activation in SQL. Deactivation removes the document from
answers and disables its citation endpoint. Original storage keys and upload
audit data do not enter model passages. Applicant documents and private case
history remain separate from this flow.

## Local evidence

- 33 focused unit/UI/route tests passed, including real synthetic PDF and DOCX
  parsing, corrupt formats, ZIP expansion, request size, permission denial before
  body consumption, toolbar placement and upload visibility.
- 19 PostgreSQL integration tests passed against disposable PostgreSQL 16,
  including inactive upload/preview, activation, verified artifact retrieval,
  public citation revocation, audit rollback/storage cleanup, migration replay,
  funding-first server pagination and existing resource synchronization.
- Architecture, form architecture, component reuse and file-size checks passed.
- Full repository lint passed with 26 existing warnings and no errors; focused
  lint passed with one existing public privacy-notice warning.
- Full TypeScript checking passed with a bounded 3 GiB Node heap. An earlier run
  observed two errors in a CMS upload test being moved by separate work; the final
  full check passed after those unrelated edits settled. A temporary alternate
  typecheck exhausted the default heap; no repository compiler settings changed.

## Acceptance boundaries

Migration application to the running app, real GCS upload, deployed parser asset
tracing and browser visual acceptance remain unverified. No production build or
deployment was performed. This document records implementation evidence rather
than client acceptance.
