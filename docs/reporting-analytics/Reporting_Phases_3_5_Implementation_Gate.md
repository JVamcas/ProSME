# Reporting phases 3–5 implementation gate

Date: 2026-10-08.

Scope: phases 3–5 of the [implementation plan](../SME_Fund_Reporting_Analytics_Implementation_Plan.md).
This records implementation and automated evidence in the workspace. Written
acceptance, deployment and live/browser acceptance remain pending.

## Implemented result

| Phase | Reviewable implementation |
| --- | --- |
| 3 | Report Definition workspace with dataset metadata, SQL template catalogue/editor, diagnostics/completion, typed parameters/output columns, draft version checks, actual PostgreSQL output validation and immutable published versions |
| 4 | Configured-report catalogue/detail/defaults, schema-driven manual runs, Runs tab/history/detail, persisted lifecycle events, private XLSX/CSV/error artifacts, fresh download authorization, idempotency, lease fencing and durable upload/finalization recovery |
| 5 | Explicit authorized bootstrap for seven templates/eight reports; stable-key idempotency, atomic inserts/audits, preservation of administrator edits and validated template/report mappings |

Feature code belongs in `src/modules/reporting`; pages compose feature views and
API routes invoke backend services. Repositories own SQL projections and writes.
Client services own HTTP and TanStack Query hooks own caching, polling and errors.
Existing table, pagination, drawer, tabs, page shell, buttons, form controls,
loading/empty states and Toast are reused. All application forms use React Hook
Form with Zod resolvers. Query, mutation, download and submission errors use the
existing toast; field validation and persisted run diagnostics remain visible.

Catalogues and run history use SQL filtering, ordering, pagination, counts and
narrow projections. History filters each run's pinned dataset permissions even
when its report later switches datasets. Granular permissions are defined in
the canonical permissions directory; processor transport credentials do not
grant access to report sources.

## Publication and persistence

Migration `0176_reporting_definitions_and_runs.sql` is registered in the existing
Drizzle journal. It creates template drafts/immutable published versions,
configured reports, pinned runs, lifecycle events, artifact references and audit
records, with referential/check constraints and immutability triggers.
Permission catalogue rows are installed without assigning grants or principals.
The complete migration chain and reporting migrations rerun successfully in
disposable PostgreSQL 16. The initial implementation turn did not apply migrations
to the application database. Follow-up inspection confirmed the local database
already had migrations through 0176 applied and an authorized bootstrap actor.

Draft saves and configuration updates use optimistic row versions. Publication
validates the restricted SQL AST and actual PostgreSQL column names/OIDs even
for zero rows, then locks/rechecks the draft before publishing atomically.
Concurrent publication of the same draft produces one version and one conflict.
Reports pin published versions, and runs copy their exact definition, report
version, parameters, source timezone/property scope, format and server timestamp.
Later edits do not change those inputs. Relative periods resolve at enqueue;
explicit date defaults cannot silently override a relative policy.

## Manual generation and artifacts

Run creation enqueues durable work. The authenticated existing internal reporting
processor retains D1 synchronization and processes generic report generation.
Queue claims use `FOR UPDATE SKIP LOCKED`, expiring leases and fencing tokens.
Events are unique per run/type and written atomically with lifecycle changes.
Generation checks the execution actor's current PostgreSQL permissions before
accessing a source. Website runs register their exact period/panel scope and stay
`PREPARING_SOURCE` when it is unavailable; missing source data is not a successful
zero-row export. A changed property/timezone context fails the pinned run.

The streaming export uses `exceljs@4.4.0` for XLSX and a backpressure-aware CSV
writer. The library's streaming interface is documented in the
[versioned ExcelJS documentation](https://github.com/exceljs/exceljs/blob/v4.4.0/README.md#streaming-xlsx).
Exact PostgreSQL numeric/bigint strings remain text in XLSX to preserve precision;
native integers/booleans keep their types. CSV text cells neutralize spreadsheet
formula prefixes while numeric signs remain intact. Zero-row exports retain the
declared header. Temporary files use mode 0600, are disposed after each attempt,
and abandoned files are cleaned in bounded batches after one hour.

| Limit | Value |
| --- | --- |
| Restricted SQL execution | Existing phase 2: 100,000 rows, 25 MiB serialized rows, 60-second overall deadline, 30-second statement timeout |
| Generated artifact | 25 MiB; overflow fails without a successful partial output |
| Generation/upload deadline | 90 seconds |
| Lease | 180 seconds |
| Concurrency | Two generation workers and two restricted SQL executions per application process |
| Catalogue/history page size | At most 50 rows |

Outputs stream to private storage with filename/MIME/size/SHA-256 metadata. A
durable checkpoint precedes upload. Recovery verifies an uploaded object's size
and checksum before finishing the original run without repeating SQL; a missing
object regenerates using the pinned inputs. A database finalization failure keeps
the checkpoint for retry. Stale workers cannot finalize or fail a reclaimed run.
Storage failures persist terminal failure and sanitized diagnostics; private error
file persistence retries independently when storage becomes available.
Downloads check fresh grants and report/run/artifact identity before storage access.

## Explicit bootstrap

```bash
REPORTING_BOOTSTRAP_ACTOR_ID='<active PostgreSQL user UUID>' \
  npm run db:seed:reporting --workspace @prosme/platform
```

Apply the migrations first. The actor requires template create/publish, report
create, dataset/query and underlying source permissions. Website property,
collection start and timezone configuration must be available for validation.
The command validates SQL/output contracts before atomic installation. Restricted
query validation is sequential to respect executor capacity; independent metadata
reads are concurrent. Existing published mappings are checked again under locks
so concurrent template changes cannot install an unvalidated configuration.
Recreating a missing report refuses incompatible edited published templates.

Templates: website analytics, application export, application pipeline, application
ageing, workflow turnaround, reviewer workload and budget commitments. The two
website configurations share the website template; the other six each map to
their corresponding template. Formats initially support XLSX and CSV, defaulting
reports to XLSX. Export, turnaround and workload default to the previous complete
month; pipeline, ageing and budget use current snapshots. Website manual defaults
use collection start through yesterday while schedules remain unimplemented.

Budget commitments reuse the accepted phase 2 rule: latest award only for a
terminal APPROVED workflow and submitted application, excluding withdrawals and
later rejection; missing amounts remain NULL with coverage diagnostics.
Unsupported reason-code, indicator-performance and chatbot reports are absent.
The bootstrap preserves edited drafts, published versions, report defaults,
names and owners. It creates no schedules, recipients, principals or grants and
is excluded from normal startup and the general database seed. Scheduling and
lifecycle notification delivery remain phases 6–7.

## Automated evidence and acceptance boundaries

- Architecture and form boundary checks: passed for 1,699 source files.
- Repository file-size gate: passed for 2,474 handwritten files. Task files also
  checked against the active 400 implementation/300 test lines and 200-line
  function limits.
- Lint and TypeScript checking: passed with zero lint errors or warnings.
- Focused reporting unit/API/export/client checks: 58 tests passed.
- PostgreSQL 16: 47 tests passed, including full migration chain/reruns,
  retirement guardrails, dataset semantics, actual XLSX/CSV reconciliation,
  publication conflicts, concurrent idempotency/claims, failure/recovery,
  permission revocation, pinned timestamps, historical source filtering and
  bootstrap preservation/incompatible mapping checks.
- Broader reporting/notification/navigation regression selection: 413 passed,
  48 PostgreSQL-dependent tests skipped in that invocation, one existing failure
  in `WebsiteAnalyticsMetricCards.test.tsx:72`. Its expectation requires
  “Comparison unavailable” while the unchanged component renders `--`; this is
  also recorded in the phases 0–2 gate. PostgreSQL fixtures run separately above.

```bash
DATABASE_URL='<disposable PostgreSQL cluster URL>' \
  node apps/platform/tests/scripts/run-reporting-database-tests.mjs
```

The runner creates a unique database, verifies historical retirement fixtures,
applies/reruns migrations and clones the migrated database per fixture family to
isolate synthetic application/form/workflow identities. It drops all databases
on completion. Export storage in these tests is an in-memory streaming adapter;
the SQL and exported file bytes are real. No real applicant data is used.

The installed Chromium cannot launch because `libnspr4.so` is absent. No browser
or system dependencies were installed, and no production build was run. Actual
editor interactions, new screen/browser acceptance, deployed private GCS
upload/download behavior, live GA source readiness, worker invocation and written
acceptance remain separate checks. No schedules or delivery were activated.

## Local bootstrap follow-up

The initial implementation omitted invoking the explicit seed and copying
`seed-reporting.ts` into the migrations image. The Dockerfile copy list is now
corrected; no image rebuild was performed in this follow-up.

The explicit command was run using the current workspace source in a one-off
container on the existing local application network, with the one existing
authorized PostgreSQL actor. It installed seven published v1 templates and eight
XLSX report configurations in the local application database. A second invocation
returned zero templates/reports created. SQL verification confirmed every mapping
in the approved catalogue, including both website reports sharing one template.
No principals or permission grants were created or changed. Anonymous requests to
the running local template/report catalogue APIs returned JSON 401 responses,
confirming route presence and authentication enforcement. This does not establish
authenticated browser acceptance or live generation/GCS download acceptance.

## Parameter editor and toolbar follow-up

Parameters now use the existing compact DataTable with Add/Edit actions opening
the existing DraggableDialog. Dialog values use a separate React Hook Form/Zod
resolver and update the template only on Save. Cancel leaves the draft unchanged,
and dialog submission does not submit the outer template form. Removing a row
renumbers SQL positions. Typed defaults, nullable values, duplicate names and
server bindings reuse the domain parameter contract; validation errors use the
existing toast. Output-column editing is unchanged.

The Create template action now belongs to the Report Templates table toolbar
and retains its create-permission check. It is absent from the page header.

Focused parameter/schema/shared-dialog checks passed: five files, 20 tests,
including actual DOM interactions for cancel, add/edit/remove, duplicate rejection,
false-default preservation/clearing, server-binding type selection and read-only
actions. Type checking and architecture/form gates passed (1,703 source files);
file-size checks passed (2,480 files), including the active 400/300 and function
limits for changed files. Lint completed with zero errors and 13 existing warnings
outside these changes. These DOM checks do not establish browser acceptance.

## Template stable-key follow-up

The template editor generates new keys from the name using the existing
`stableKeyFromLabel` helper, normalized to the reporting key format. Saved
templates retain their stored key when renamed. The stable-key field is removed
from the template form; the API identity and optimistic version contracts remain
in force. Output-column editing remains as implemented above.

Focused schema, template DOM, parameter editor and existing generator checks
passed: five files, 24 tests. Architecture and form checks passed for 1,702 source
files, and the file-size gate passed for 2,480 files. Changed implementation and
test files are also below the active 400/300-line limits. Lint completed with zero
errors and 13 existing warnings outside this change. Repository type checking is
blocked by two remaining imports of the separately deleted
`ReportCatalogueSearch` component in `ReportCatalogue` and
`ReportConfigurationForm`; no type errors remain in the stable-key change.

## Configured report stable-key follow-up

The configured report form also omits the stable-key input. New reports use the
existing `stableKeyFromLabel` generator with the reporting key format; edits
preserve the stored key and optimistic row version. The form resolver adds the
key before applying the shared report validation used by saving and bootstrap.
Validation failures continue through the existing toast.

Focused configured-report/template DOM, schema, protected route and existing
generator checks passed: five files, 23 tests. Repository type checking now
passes, including the previously blocked imports resolved separately in the
workspace. Architecture/form gates passed for 1,702 source files and file-size
checks passed for 2,481 files. Changed implementation/test files remain below the
active 400/300-line limits and functions below 200 lines. Lint completed with
zero errors and 13 existing warnings outside these changes. DOM checks do not
establish browser acceptance; no production build was run.

## Required descriptions follow-up (2026-10-08)

Datasets, report templates and configured reports now persist a required nonblank
Description of at most 2,000 characters. Initial descriptions summarize the
source, result-grain and default-scope text in the implementation plan's
[bootstrap inventory](Reporting_Bootstrap_Inventory.md). Descriptions appear in
the catalogues, the template Details/review steps and report Configuration.
Dataset descriptions remain developer-owned metadata on immutable versions.

Migration `0177_reporting_descriptions` fills missing descriptions on the three
datasets and existing templates/reports, including metadata-derived descriptions
for custom records. It preserves definitions/defaults and existing descriptions
on rerun, restores the dataset immutability trigger, and enforces database
non-null, nonblank and length constraints. Explicit bootstrap supplies documented
descriptions and preserves administrator-edited descriptions on subsequent runs.

Focused evidence: 24 form/schema/protected-route tests passed. The full migration
chain and migration reruns passed in disposable PostgreSQL, with 48 database tests
covering description backfills/constraints, catalogue projections, edits,
bootstrap preservation and the existing report lifecycle. Lint, type checking,
architecture/form boundaries and file-size checks passed. The metadata test was
split from the dataset projection suite to keep both below the active test gate.

The broader reporting unit run passed 227 tests and failed six: five parameter
table cases still select removed text buttons after separate icon-button edits,
and the analytics metric-card test expects `Comparison unavailable`. Those
failures are outside the description change. No production build or browser
acceptance was performed. Migration 0177 has been verified in disposable
fixtures; it must be applied to the application database with the updated code.
This follow-up records focused evidence, not deployment or release acceptance.

## Report configuration card and edit drawer follow-up (2026-10-09)

The approved report read view shows dataset and template names with pinned
versions, output format, default period and a shared DataTable of saved parameter
defaults. The detail repository projects dataset/template names in the same SQL
query, using the published definition's dataset version. The existing manual run
form, runs tab and download authorization remain available.

Edit report requires the existing report-update and template-read permissions and
opens the existing RightDrawer with the React Hook Form/Zod configuration form.
Cancel discards edits, successful saves refresh the query and close the drawer,
and failed saves leave the form open. Parameter presentation preserves explicit
null, false, zero, empty text, arrays and template defaults, and explains relative
dates and server bindings without showing stale runtime values.

Focused evidence: four unit/DOM files and 29 tests passed, covering the read view,
real edit form, cancel/save/failure behavior, permission combinations, run controls
and parameter semantics. The disposable PostgreSQL migration chain and reruns
passed with 48 tests, including the detail projection after template/report names
diverge and a draft SQL edit leaves the published definition pinned. Lint passed
with zero errors and the same 13 unrelated warnings; type checking,
architecture/form boundaries and file-size checks passed.

Browser acceptance remains unverified: the existing Playwright browser could not
launch because libnspr4.so is missing. No browser dependencies were installed and
no production build was run. The disposable database container was removed;
these checks did not migrate or change the application database.

## Report configuration versions and form cleanup (2026-10-09)

The report editor has two sections: Report details (name and description) and
Report configuration (template, default period, format and parameter defaults).
Template version is no longer editable or accepted in the save API. The server
selects the current published version for new reports or a different template;
edits using the existing template retain its saved published version.

Migration 0178 separates report configuration versions from optimistic row
versions. Configuration changes atomically create a new immutable snapshot;
name/description edits and identical configuration saves retain the configuration
version. Row versions still change on saves to prevent concurrent overwrites.
Bootstrap reports receive version-one snapshots, and runs pin the configuration
version independently of metadata edits. The read card displays this version.
Untouched parameter defaults are preserved when saving metadata, including cases
where form controls display implicit template defaults.

Existing report version numbers are preserved from their prior row versions so
run history retains its identifiers. Only the current pre-migration configuration
can be snapshotted; earlier configurations were not stored and are not fabricated.

Focused evidence: six unit/DOM files with 55 tests passed. The disposable
PostgreSQL migration chain, migration reruns and 57 reporting tests passed,
including configuration-versus-metadata changes, snapshot immutability,
concurrent stale saves, JSON key-order equality, automatic/pinned template
selection, run version pinning and populated migration reruns. Type checking,
architecture/form boundary and file-size checks passed. Lint passed with zero
errors and 13 unrelated warnings.

The application database was not migrated. Apply migration 0178 before running
the updated application. Browser, production build, deployment and release
acceptance were not performed.

## Report run drawer design follow-up (2026-10-09)

The report run drawer now follows the approved visual preview: a tinted status
panel containing the actual error, compact format/row/timezone metadata, pinned
template and report versions, file cards with accessible download buttons and
collapsed SHA-256 disclosures, a recorded-event timeline, and aligned resolved
parameter rows. Long filenames truncate visually while retaining the full name
in the title and download label. Narrow screens stack metadata and parameter
rows. Current states and empty event/parameter lists remain readable without
fabricating lifecycle events or replacing saved values with template defaults.

The existing RightDrawer, Badge, IconButton, TanStack Query hooks, client
service, and protected download endpoint remain the reused interaction path.
Downloads retain their permission visibility, pending-state disabling, original
filename, and object URL cleanup. No API, persistence or authorization changes
are included.

Focused implementation checks passed: four unit/DOM files and 42 tests covering
all run states, section order, recorded events, resolved value semantics,
checksum expansion, authorized/unauthorized downloads, pending downloads and
drawer Escape behavior. Architecture/form boundaries, file-size checks and type
checking passed. Lint completed with zero errors and 14 warnings outside the
files changed for this follow-up.

This records focused implementation acceptance only. Browser appearance and
interaction remain unverified: the existing Chromium executable has missing
libnspr4, NSS and ALSA libraries. No browser dependencies were installed.
No production build, deployment or release acceptance was performed.
