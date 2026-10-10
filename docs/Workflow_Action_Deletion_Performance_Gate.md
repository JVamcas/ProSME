# Workflow action deletion and graph loading

Date: 2026-10-10

## Implemented behavior

Deleting an action now locks and checks the exact workflow version and owning
definition, validates Draft status and the expected revision, and removes only
that stage's selected action, its task bindings, source transitions, and their
targets. Remaining action order is compacted within that stage while preserving
record identities. The revision increment and action-specific audit record are
written in the same transaction. Restrictive foreign keys remain enforced.

The command no longer loads a graph before deletion or calls the full draft
replacement operation. Unrelated stages, tasks, forms, routes, and requirements
retain their existing records. Unrelated invalid draft configuration does not
prevent deletion; it remains visible in the response's editor validation.

Graph loading now uses eight bounded, concurrent projections: header, stages,
actions, tasks with their optional form binding, task action bindings,
transitions, transition targets, and join predecessors. Each projection filters
the exact version and orders its records in SQL. Independent collections are
never joined together, eliminating the multiplication of stage/action/task rows
by all workflow transitions. Existing stage requirement loaders are reused;
the complete graph uses 13 queries regardless of stage count.

## Verification evidence

- 181 unit tests passed across 35 files covering action deletion and workflow
  definition editing. Authorization fails before persistence access, and
  deletion conflicts do not return a successful editor response. A further
  action-domain run passed 64 tests in seven files, including the deletion
  tests already counted above.
- Eight PostgreSQL integration tests passed in two files, using disposable
  schemas and synthetic records. Fixtures restore real workflow lifecycle and
  immutable-child guards, positive/unique action ordering constraints, and the
  restrictive binding/route foreign keys.
- Database checks cover scoped deletion, unaffected identities and form
  bindings, order compaction, revision and audit persistence, stale/mismatched
  targets, published-version protection, full rollback on audit failure,
  concurrent deletion, exact graph projections and version isolation, fixed
  query counts, stage requirements, branching routes and join predecessors,
  and empty/unknown versions.
- Full lint completed with zero errors and 23 existing warnings. Type checking
  and final touched-test lint passed.
- Architecture and form architecture gates passed for 1,770 source files;
  file-size checks passed for 2,602 handwritten files. Changed functions pass
  the 200-line limit. `git diff --check` passed.

This record accepts the implementation and local automated evidence. No schema
migration is needed. The GCP application must be rebuilt and redeployed before
these changes affect its delete handler. No production build, deployment,
browser verification, or post-deployment latency measurement was performed.
