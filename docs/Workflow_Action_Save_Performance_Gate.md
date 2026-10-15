# Scoped workflow action saves and cache refresh

Date: 2026-10-15

## Scope and behavior

Adding or editing a workflow action uses a scoped PATCH command at `/api/workflows/{id}/definition-actions`. The browser sends the action, its task selections, and its routes, with the exact draft version and row version. It does not send the whole graph.

The service verifies authorization, definition/version/stage ownership, draft status, concurrency, unique keys/orders, task membership, and route ownership/targets. It applies the existing common/decision action binding policy only to the selected action. The repository uses a transactional version compare-and-swap, updates or inserts that action, synchronizes changed bindings, and replaces routes only when that action's routing changed. Audit persistence is atomic. Unrelated stages, tasks, actions, bindings, and routes retain their identities and values.

Saving reuses its initial graph read to construct the response and validates the result once. Save and delete responses omit unchanged assignment options. The cache retains those options, updates the returned exact version, and preserves an existing different default version. Editor, assignment, published, and catalogue requests are not immediately refetched; catalogue caches are marked stale for their next use.

Deletion retains its existing scoped transaction and now uses the same cache refresh behavior. Other workflow editing operations retain their existing save path.

## Evidence and local acceptance

- Seven initial focused suites passed: 54 tests covering saves, protected routes, SQL scope, action dialogs, deletion, and cache reuse. Additional service and response coverage passed in the broader run.
- Seven tests passed on disposable PostgreSQL 16 using an existing local image. Temporary tables recreated relevant unique constraints and restrictive foreign keys. Checks cover label-only saves, creation/bindings, route replacement, stale/wrong-definition/published rejection, and rollback on an injected audit failure. The label-only save executed exactly three writes: version update, action update, and audit insert.
- The broader workflow/unit run recorded 1,000 passing tests, six skipped tests, and two failures in the path-action suite. The obsolete full-graph save assertion was updated and a missing-default-cache edge case was corrected. Both affected UI suites then passed all nine tests, including older-version cache preservation and no redundant editor GET.
- Removed the unused client graph-replacement helper; its routing coverage now exercises the domain update helper. Both direct routing tests passed.
- Full type checking passed.
- Full ESLint passed with existing warnings; the new unused test import was removed and checked separately.
- Architecture boundaries, form architecture, component reuse, and diff whitespace checks passed.
- Changed implementation functions and files meet the repository instructions' limits. The stricter repository file-size command still reports five existing violations outside this task: FormRepository, FormDraftSyncPostgres, WorkflowTemplateDeletionPostgres, ServerApplicationDocumentService tests, and ServerFormsService tests.

The scoped persistence and cache acceptance criteria are satisfied by the tests above. This is local code/database evidence, not deployed or browser latency evidence. No application database, production build, deployment, publication, or funding-call binding was changed. The disposable PostgreSQL containers were removed after the tests.
