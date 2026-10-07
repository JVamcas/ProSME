# Funding Overview independent section publishing

## Scope and behavior

Funding → Overview contains three native Payload Pages editors:

| Section | CMS route | Unique document slug |
| --- | --- | --- |
| What the fund supports | `/cms/funding/overview/support` | `funding-support` |
| Priority applicants | `/cms/funding/overview/priority-applicants` | `funding-priority-applicants` |
| Focus sectors | `/cms/funding/overview/focus-sectors` | `funding-focus-sectors` |

The Overview root redirects to Support. Each document has its own draft,
publication, and native version history. Focus headings, notice, and sector
rows belong to one document and publish together. Each editor previews the
existing public section component from its current form state.

The public funding URL and section order remain unchanged. A backend content
service reads one bounded repository projection for all three documents.
Public visitors receive published documents; draft preview requires the
canonical `cms.pages.read` permission. Native writes retain Pages create,
update, delete, and publish permission checks. A server validation hook rejects
foreign section blocks and changes to section identifiers.

## Migration and existing content

`20261007_200000_independent_funding_overview` adds versioned sector array tables
and copies the currently published section content into three documents. It
then saves any different current edits as drafts. Sector order is preserved.
The migration uses Payload's migration transaction for the document and audit
writes; existing section documents are not overwritten on a repeat run.

Original `funding` / `eligibility` documents, their version histories, and all
legacy eligibility records remain intact. Eligibility criteria are not moved.
The public Overview now reads the independent documents; legacy records are
retained as historical source material.

An empty installation is left to the explicit baseline seed, which includes
all three independent documents. Rollback refuses to discard existing section
documents: editorial changes must be reconciled before reverting the model.

The migration was applied to the local `smefund` database on 7 October 2026.
All three new documents were verified as published. Each original document
retained its 50 stored versions. No production database was changed.

## Verification and acceptance

- Final content unit suite: 43 files / 376 tests passed, including
  empty-database and explicit baseline-seed regression checks.
- Isolated PostgreSQL suite: 7 tests passed. It installs the actual CMS
  migrations and tests published/draft preservation, sibling publication
  isolation, focus publication as one document, native version restoration,
  server permission denial, retained histories, and migration repeatability.
- Full lint passed with 13 unrelated existing warnings. Final focused lint
  passed for the changed implementation and tests; migration files follow
  the repository's existing lint exclusion.
- Type checking, architecture boundaries, form architecture, file limits, and
  whitespace checks passed.
- Existing Chromium could not launch because `libnspr4.so` is unavailable.
  No browser or browser dependencies were installed.
- No production build was run. The app on port 3008 uses a built Docker image
  without a source mount; that image must be rebuilt to expose these routes.

User browser acceptance is pending. This record does not claim a passed live
editor or deployment acceptance gate.
