# Notification catalog search — local acceptance

Date: 15 October 2026.

## Behavior

The Email templates channel workspace has a Search catalogs field with Search and Clear actions. Search matches catalog names, stable keys, and descriptions without case sensitivity. Matching catalogs retain all of their event template targets and existing version counts and ordering. Global fallback remains available. No-match searches show an explicit empty state, and clearing restores all catalogs.

The form uses React Hook Form, the shared input/button controls, and the Zod transport schema. The TanStack Query hook owns separate search cache keys under the existing channel prefix, so existing mutations invalidate filtered results as well. The frontend service encodes search in the channel request URL. The protected service validates the 200-character search limit and checks the canonical notification configuration read permission before database reads.

Filtering runs in PostgreSQL against the catalog joins, including catalog metadata for event targets. Search treats SQL wildcard characters as literal text. The existing target-list projection was moved to a focused notification infrastructure repository to keep touched files within the repository's existing size gate. Channel metadata and template targets are read concurrently. No database migration is required.

## Verification

- All 194 notification unit and UI tests passed, including search/clear, matched event expansion, no results, query forwarding, transport validation, and permission denial before reads.
- Eight tests against disposable local PostgreSQL passed: full and whitespace searches, case-insensitive catalog matching, description matching, channel isolation, ordering and version-count projection, empty matches, and literal percent/underscore/backslash searches.
- Full lint passed.
- Type checking passed.
- Architecture boundary, form architecture, and component reuse checks passed.
- Changed-file functions remain within 200 lines; all changed files meet the existing 400/300-line file gate.
- `git diff --check` passed.

The full repository file-size gate still reports five unchanged baseline files:

- `apps/platform/src/modules/forms/infrastructure/FormRepository.ts` — 422/400.
- `apps/platform/tests/integration/FormDraftSyncPostgres.test.ts` — 392/300.
- `apps/platform/tests/integration/WorkflowTemplateDeletionPostgres.test.ts` — 332/300.
- `apps/platform/tests/unit/application-documents/ServerApplicationDocumentService.test.ts` — 400/300.
- `apps/platform/tests/unit/forms/ServerFormsService.test.ts` — 363/300.

## Acceptance

Local implementation is accepted against the automated checks above. Browser and deployed acceptance were not performed. No application database was changed, and no production build or deployment was run. The temporary PostgreSQL test container was removed after testing.
