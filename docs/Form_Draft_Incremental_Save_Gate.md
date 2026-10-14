# Incremental form draft save verification

Date: 2026-10-14

## Problem and change

Adding, editing, deleting, duplicating, and reordering a field previously saved
all sections and fields by deleting and reinserting the draft content. A successful
save then invalidated the editor query even though the response already contained
the updated editor.

`saveFormDraft` now synchronizes draft content through the forms infrastructure
repository. A bounded SQL comparison identifies changes; only necessary mutation
statements run. Unchanged fields and sections are not written. Options are replaced
only for fields whose ordered option list changes. The existing version claim,
draft-only restriction, transaction, full-form validation, and authoritative editor
response remain in place. Supplied field and section IDs must be unique.

Reordering temporarily releases changing unique keys/orders inside the transaction
and restores their requested values before commit. Cross-section moves establish
the destination first and remove obsolete sections afterwards. IDs from another
version fail without updating that version; the transaction rolls back.

The update hook sets the latest and exact-version editor caches from the response.
It invalidates catalogue and published-form queries without refetching the editor.
Saving an older draft updates its exact-version cache and the version summaries
without replacing the newer default draft.
The transport continues to submit the bounded full-form input and return the editor;
this change optimizes persistence and removes the redundant browser GET.

## Acceptance evidence

- Disposable PostgreSQL 16 integration: 10 tests passed. Row-level triggers verified
  that a label edit updates exactly one field, an add inserts only the new field,
  and unrelated sections/fields/options remain untouched. The label-edit transaction
  executes three statements excluding BEGIN/COMMIT: version claim, change comparison,
  and field synchronization. An unchanged-content save executes two and writes no
  child records.
- Database cases also cover duplicate option copying, deleting options with their
  field, field/key swaps, section reordering, cross-section moves, section deletion,
  changed options, document limits, stale revisions, published versions, and rollback
  on foreign-version identifiers.
- Editor regression tests assert no extra GET after duplication or metadata save.
- Forms and editor unit regression: 263 tests passed across 61 files. Two additional
  cache tests passed for latest/older drafts, including active editor queries and
  catalogue invalidation. The six editor-action tests passed again after this safeguard.
- Type checking passed; lint passed with 17 existing warnings and no errors.
- Architecture boundary, form architecture, and component reuse checks passed.

Accepted for local source and disposable-database verification. No production build,
GCP deployment, browser timing measurement, or live database change was performed.
