# Funding call stage pipe

Date: 2026-10-15

## Scope and behavior

The staff application workflow tab now places a constant-width navy cylinder
beside its stage list. Counts and CSV download icons belong to the cylinder;
stage status backgrounds remain on the stage-name side. Selecting a count
opens a paginated application list; selecting a stage name restores the
application's existing workflow details.

The cohort is the current application's funding call, across every workflow
version used by that call. Stages are matched by stable stage key, so renamed
stages retain their history when their key is preserved. Stages from other
versions remain visible. Definitions without activated applications show zero.
NOT_STARTED instances do not count as reached. Soft-deleted applications are
excluded; ended and withdrawn applications with reached stages remain included.

Each application appears once per stage. Its greatest iteration number supplies
the reached date, score and comments; activation date and instance ID break ties.
Earlier runs never supply missing evidence for a newer run.

The list and export contain applicant name, submitted business details where
available, reached date, funding call, latest run, average score and comments.
The CSV also includes submission date and the stage name. Scores are normalized
to percentages of the available maximum, respecting configured source weights,
and averaged across completed reviews. Completed form snapshots supply form
scores and comments; legacy reviews use their configured scoring criteria and
comment fields. Draft/superseded reviews are excluded. A reviewing actor's
unreleased peer evidence remains excluded under the existing release policy.

## Authorization and query boundaries

- Counts require `funding.application.all.read` and `workflow.instance.all.read`.
- Application lists additionally require `workflow.task.all.read` because they
  contain review evidence. Downloads also require `funding.application.export`.
- Every API operation checks these permissions server-side before reading scope.
  The funding call is derived from the target application, not a caller-supplied
  funding-call or workflow-version filter.
- SQL performs stage grouping, deduplication, ordering, counting and pagination.
  Evidence reads are restricted to the selected page. Exports process 100 rows
  per batch in a read-only repeatable-read transaction and use the shared report
  writer, including its formula protection and 25 MiB artifact limit.
- The UI uses domain TanStack Query hooks and a frontend client service. The
  existing shared table, pagination, buttons and toast are reused. Table header
  sorting is disabled to avoid sorting only one page of server results.
- No schema changes, migrations, builds or deployments were performed.

## Validation evidence

- Final focused run: **10 test files, 54 tests passed**, with one worker.
  This included the new service, protected route, pipe interactions and actual
  PostgreSQL queries/CSV exports, plus existing workflow/application regressions.
- PostgreSQL checks: **10 passed** against an isolated disposable PostgreSQL 16
  container using temporary tables and synthetic data. Coverage includes multiple
  versions/calls, repeat runs, snapshot business data, weighted form scoring,
  peer-release thresholds, draft/superseded evidence, empty pagination pages and
  CSV formula protection. This is query evidence, not live database acceptance.
- Full lint: **zero errors**, with 20 unrelated existing warnings. A subsequent
  focused lint run also had zero errors; its only warning was the CSS module
  being outside ESLint's configured file types.
- Type checking: **passed**.
- Architecture, form architecture and component reuse checks: **passed**.
- `git diff --check`: **passed**.
- File-size gate remains blocked by existing violations in `FormRepository.ts`,
  `FormDraftSyncPostgres.test.ts`, `WorkflowTemplateDeletionPostgres.test.ts`,
  `ServerApplicationDocumentService.test.ts` and `ServerFormsService.test.ts`.
  No files introduced or modified for this feature appear in that failure list.

## Acceptance still open

Browser layout verification was attempted with the existing Chromium at 390,
820 and 1440 px, but Chromium could not launch because `libnspr4.so` is missing.
No browser or system dependencies were installed. The opt-in layout test remains
available as `WorkflowStageFunnelLayout.test.tsx` using
`RUN_STAGE_FUNNEL_LAYOUT=true`.

This record confirms local source, interaction, policy and disposable-database
checks. It does not record browser, running-container, deployed or user visual
acceptance. Overall release acceptance remains open for those checks.
