# Form version table links and actions

Date: 2026-10-15

## Scope

- Latest-version and version-history numbers link to the exact form version using `versionId`.
- The main form row retains Edit.
- The version table has an Actions column with the shared ActionMenu for Preview, Publish, Retire, and Clone.
- Preview loads the selected version. Lifecycle commands use its ID and row version. Clone uses its source version ID and opens the returned draft version.
- Existing permissions, status restrictions, pending indicators, and API authorization remain in place.

## Local evidence and acceptance

- Four focused suites passed: 14 tests across FormVersionActions, FormVersionQuery, FormVersionRoute, and FormsPagination.
- Focused ESLint passed for all five changed implementation files and the new test file.
- Architecture boundary, form architecture, and component reuse checks passed.
- Diff whitespace check passed.
- New and changed files in this task satisfy the repository instructions' file and function limits.
- The repository file-size command still fails on existing violations in FormRepository, NotificationEvent, FormDraftSyncPostgres, WorkflowTemplateDeletionPostgres, ServerApplicationDocumentService, and ServerFormsService tests. This task adds none of those violations.
- Full type checking did not finish within the bounded 120-second run (exit 124); it is not recorded as passed.

Local behavior is supported by the listed automated tests. Browser acceptance and deployment are unverified. No production build or deployment was performed.
