# D1 website analytics implementation record

Date: 2026-10-06.
Scope: D1 metrics, collection, protected API and dashboard from
[the implementation plan](../SME_Fund_Reporting_Analytics_Implementation_Plan.md).
Status: implementation reviewable; live D1 acceptance remains pending. R1/R2
schedules and reporting emails are outside this change. D1 aggregate persistence
in dedicated tables in the existing PostgreSQL database is included following
the agreed architecture correction.

## Delivered behavior

- `/admin/analytics/website` and `/api/reporting/website` require
  `reporting.website.read.all` before SQL reads or registering synchronization work.
  The migration grants this permission explicitly to `system_administrator` only.
- Six metric cards use GA `totalUsers`, `screenPageViews`,
  `averageSessionDuration`, tracked start/submission users and an independently
  ordered start-to-submit completion denominator. No denominator is unavailable.
- Apache ECharts renders all charts through the shared SVG chart component.
  Shared tables/text provide equivalents. Its choropleth/scatter map renders the sourced fourteen-region Namibia
  asset; no illustrative/generated map geometry is used. See the
  [boundary attribution record](../../apps/platform/src/modules/reporting/ui/website/assets/README.md).
- Sources return ready, no-data, unavailable, failure or stale states independently.
  Each predefined journey retains its own source state. No runtime fixtures exist.
- Date inputs use React Hook Form/Zod. Requests allow ordered inclusive periods
  of at most 366 days and optional UUID call scope. Traffic/pages remain website-wide,
  geography is Namibia-only, and event/journey/SQL panels follow call scope.
- Four-step application and two-step self-check paths are measured closed funnels.
  The exact same funding-call parameter filter appears in every scoped step.
  Unfiltered paths may span calls; the dashboard states that limitation.
- Approved browser events are `funding_call_view`, `call_document_download`,
  `eligibility_check_complete`, `application_start` and `application_submit`.
  Start/submission events follow confirmed server responses and use local retry
  deduplication. Private application identifiers are never event metadata.
- Consent persists across public/auth/applicant layouts. Page/referrer metadata
  is allowlisted and sanitized; query strings, private identifiers, answers,
  free text, document URLs/names and reviewer information are excluded.
- Microsoft Clarity uses its SDK through a client service, accepted consent and
  approved public content routes. Body masking is installed before capture.
  Forms/auth/portal/operations/CMS and query/hash routes are excluded. Navigation
  guards stop capture before history changes; late SDK imports cannot restart it.
  Dashboard access is a configured provider link, not a fictional heatmap preview.
- Anonymous advisory checks retain only call ID/current row version, ruleset
  version ID, outcome category and timestamp. SQL aggregates by local period/call.
  Logging failure or timeout leaves applicant guidance available. These counts
  are assessments, not visitors or formal eligibility decisions.
- GA requests have 15-second timeouts, concurrency four and bounded queues/rows.
  The background worker persists completed aggregates per source. Dashboard reads
  use PostgreSQL, retaining successful sources through failures and restarts.
  Sampling/thresholding/other-row metadata is preserved. Permissions precede reads.
- Namibia region shares use the sum of regional user counts including unknowns.
  Users may appear in multiple regions/calls. Unknown names remain visible;
  aliases require live source verification before being mapped to polygons.
- Sidebar sections are non-clickable accessible labels, derived after permission
  filtering. Empty groups disappear; collapsed labels remain available to assistive
  technology. Website reports has no link until its later phase ships.

## Provider configuration and activation

1. Set the web stream's `G-...` ID as `GA_MEASUREMENT_ID` in each environment.
   Blank or invalid IDs disable GA collection. The CMS Measurement ID editor field
   is hidden and its legacy saved value is ignored; the rest of Site Settings
   remains available. `GA_COLLECTION_ENABLED=true` and visitor consent remain
   required. The numeric `GA_PROPERTY_ID` is separate.
2. Set `GA_PROPERTY_ID`, the actual IANA `GA_PROPERTY_TIMEZONE` and
   `GA_COLLECTION_START_DATE` in the runtime environment. Enable Google Analytics
   Data API for the integration project. Grant read access on the GA property to
   the integration service account. Use Application Default Credentials or
   server-only `GA_SERVICE_ACCOUNT_JSON`; do not reuse browser/Firebase secrets.
3. Register event-scoped GA custom dimensions `funding_call_id` and
   `page_category` using those event parameter names. `eligibility_outcome` is an
   optional additional custom dimension for provider-side inspection.
   The funding-call dimension can be registered with
   `npm run analytics:configure` from the repository root. It uses `GA_PROPERTY_ID`
   and `GA_SERVICE_ACCOUNT_JSON` (or Application Default Credentials), checks all
   existing definition pages and creates only a missing event-scoped
   `funding_call_id`. Preview with `npm run analytics:configure -- --dry-run`.
   Enable Google Analytics Admin API in the credentials' Cloud project and grant
   the setup identity Editor or Administrator access to the GA property. The
   setup command requests `analytics.edit`; normal reporting stays read-only.
   If the Admin API is disabled, `npm run analytics:configure -- --enable-api`
   enables that API in the consumer project reported by Google before registering
   the dimension. This option also requires `serviceusage.services.enable` on
   that Cloud project and requests the `cloud-platform` OAuth scope. It cannot
   be combined with `--dry-run`.
   `--enable-api-with-adc` uses the existing gcloud Application Default Credentials
   only to enable the Cloud API, while keeping the configured GA credentials for
   custom-dimension registration. Use this when the GA integration identity cannot
   enable Cloud APIs; its GA property access still needs to allow registration.
4. Disable GA enhanced measurement in the web data stream before setting
   `GA_COLLECTION_ENABLED=true`. Automatic history/form/download/outbound
   collection would bypass the application metadata allowlist. The explicit flag
   defaults to false; configured GA read access does not enable browser collection.
   Remove any additional tag installation that automatically collects raw URLs.
5. Set `CLARITY_PROJECT_ID` to the chosen Microsoft Clarity project's ID and grant
   the intended administrators access in Clarity. No account ID or credentials
   are invented by this change. The application masks all body content and does
   not identify visitors to Clarity. Verify project-side masking and capture
   behavior before live acceptance.
6. Apply `0164_website_analytics_collection.sql` through the existing Drizzle
   migration runner, then refresh/re-authenticate permission projections. The
   local container database has been migrated. Existing application images have
   not been rebuilt/deployed as part of this source implementation.

The ordered API contract follows the official
[GA funnel guide](https://developers.google.com/analytics/devguides/reporting/data/v1/funnels)
and [runFunnelReport reference](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1alpha/properties/runFunnelReport).
Clarity capture uses the official SDK's start/stop and
[consent API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-v2).

## Validation evidence

- Architecture and form gates: passed for 1,526 source files.
- File-size gate: passed for 2,226 handwritten files. Related self-check test
  fixtures were split into a focused fixture file rather than compressed.
- Lint: passed with zero errors and twelve existing warnings.
- Focused reporting/collection/self-check/submission checks: 43 passed; the
  three opt-in SQL tests were skipped on the host and executed separately below.
- Container PostgreSQL tests: three passed against `smefund-local-db` using
  Docker network `smefund-local_platform`. Temporary schema/test writes rolled
  back. Checks cover approved columns, explicit role grants, recorded versions,
  call filtering, category aggregation and inclusive Windhoek date boundaries.
- Full migration chain: all 165 migrations applied to a temporary database;
  repeat invocation preserved the journal count and reporting table. The
  temporary database was removed. The normal migration runner subsequently
  applied the migration to the local database successfully.
- Full suite: 2,613 passed, 227 skipped and three existing failures (594 passing
  files, three failing files, 52 skipped files; 649 total). The failures are
  `home-funding.test.tsx` resource-thumbnail expectations,
  `portal-navigation.test.ts` CMS link expectations, and
  `portal-shell.test.tsx` CMS link expectations. All D1 tests passed in this
  complete run. The earlier run had 2,609 passed,
  227 skipped and four failures, including one reporting import timeout fixed
  by mocking an unrelated repository dependency. The other failures were
  existing CMS navigation/resource expectations; they were not changed to
  contradict the plan's CMS workspace boundary.
- Type checking: remaining errors are in the concurrent Resource Centre changes,
  `src/payload/collections/content/Resources.ts` and
  `tests/unit/content/ResourceEditorFields.test.ts`. D1 test input types were
  corrected; the latest direct check reports no D1 errors. This is not a passed
  repository type-check gate.
- Production build: the Next build lock cleared; compilation succeeded. Its
  TypeScript worker exited with code 1. Direct TypeScript evidence above identifies
  the remaining workspace errors. This is not a passed production build.
- Browser validation: not passed. Host Chromium failed because `libnspr4.so`
  is missing. Chromium launched after dependency installation in a disposable
  container, but the isolated preview timed out before its dashboard heading
  rendered. This result does not distinguish a preview-harness issue from a
  component issue. Further container troubleshooting was stopped; temporary
  containers were removed. Authenticated browser and live-source acceptance
  remain pending. Fixtures do not establish live provider acceptance.

Repeat the focused checks with:

```sh
npm run test --workspace @prosme/platform -- tests/unit/reporting tests/integration/reporting tests/unit/eligibility/ServerPublicEligibilitySelfCheckService.test.ts tests/integration/PublicEligibilitySelfCheckRoute.test.ts tests/unit/applications/ApplicationViewInvalidation.test.tsx
```

Opt-in real SQL checks, using the existing local database network:

```sh
docker run --rm --network smefund-local_platform \
  -v "$PWD:/workspace" -w /workspace \
  -e RUN_REPORTING_DATABASE_TESTS=true node:24.13.0-bookworm-slim \
  node --env-file=.env node_modules/vitest/vitest.mjs run \
  --root apps/platform tests/integration/reporting/AnonymousEligibilityRepository.test.ts
```

## Environment configuration follow-up

- Browser GA collection now reads only `GA_MEASUREMENT_ID` in public,
  authentication and applicant layouts. Blank/invalid IDs and a disabled
  collection flag prevent collection; visitor consent is still required.
- Site Settings remains available. Its legacy Measurement ID field is hidden
  and omitted from the public content projection. Existing columns are retained;
  this UI/configuration change does not require a database migration.
- Architecture/form and file-size gates passed; lint has zero errors and the
  same twelve existing warnings. All 50 focused reporting and Resource Centre
  tests passed; the three opt-in SQL tests were skipped in this host run.
- Type checking now passes after correcting the Resource Centre hidden-field
  transformation and narrowing its tests' access to Payload admin properties.
  This supersedes the Resource Centre type-check blocker recorded above.
- The container production build passed, including TypeScript and all 88 static
  pages. The `smefund-local-platform` application image was rebuilt successfully;
  running application containers were not recreated by this verification.
- The follow-up full suite had 2,617 passing, 227 skipped and seven failing
  tests. Four additional workflow failures passed in a separate 16-test rerun
  with one worker; the three existing resource-thumbnail/CMS-navigation
  expectation failures remain. This is not a passing full-suite gate.

## Live empty traffic report follow-up

- A read-only `runReport` from the local app returned HTTP 200 with
  `kind: analyticsData#runReport`, `Africa/Windhoek` metadata and quota, but no
  rows or metric headers. The event-scoped report returned headers with no rows.
  Credentials and property access work; this was a response parsing failure.
- The response adapter now recognizes that successful headerless empty report
  as `no-data`, preserving source metadata and returning zero traffic values.
  Missing headers on populated/malformed responses still fail validation, and
  the configured property timezone must still match.
- Browser collection is enabled with a valid environment Measurement ID and
  collection start date `2026-10-06`. No collection configuration was changed.
- All 46 focused reporting tests passed; three opt-in SQL tests were skipped.
  Type checking, architecture/form and file-size gates passed. Lint has zero
  errors and twelve existing warnings.

## Agreed persistence and presentation correction

- D1 now uses dedicated `app_reporting_website_queries` and
  `app_reporting_website_source_snapshots` tables in the existing PostgreSQL
  database. Migration `0165` follows the anonymous eligibility migration.
- Dashboard reads authorize first and execute one SQL statement to register the
  exact current/previous scopes, project stored source results, aggregate dated
  eligibility checks and compute the six previous-period changes. Dashboard reads
  never invoke GA. Distinct users and ordered funnels are stored as completed
  exact-period GA aggregates, rather than summed from daily distinct counts.
- The existing scheduler invokes `/api/internal/reporting/process`. Its separate
  reporting loop polls every 15 seconds, claims one due report with a two-minute
  lease and refreshes recently requested reports every five minutes. Successful
  sources replace their snapshots atomically; failures preserve previous values.
  Lease tokens fence superseded workers. No raw GA events or identities are stored.
- A failed source or a snapshot older than ten minutes is displayed as stale.
  First-time periods wait for synchronization; missing data is not invented.
  Previous periods outside collection coverage and zero comparison denominators
  have no percentage change. Pending results poll through the existing query hook.
- Compact KPI cards have labels above values, upper-right blue/violet icon tiles,
  and measured green/red changes. The previous orange watermark is absent from
  this summary variant; other dashboard variants retain their existing behavior.
- The application chart uses Recharts `FunnelChart`/`Funnel` with Funding Call
  View → Eligibility Check Completed → Application Started → Application Submitted.
  The actual GA closed-funnel request uses those four events in that order and the
  same call scope throughout. Contract `d1-v2` prevents reuse of three-stage reports.
  Empty results show four neutral funnel segments with real zero counts.
- Namibia uses MapLibre GL 6.13.0, the existing fourteen-region GeoJSON, native
  pan/zoom controls and licensed-source attribution. Refetching updates its data
  layer without recreating the map. Region counts appear on hover/selection.
- Explanatory chart captions and visible scope paragraphs were removed. The shared
  `InfoTooltip` holds source metadata, scope and refresh detail. Empty/stale badges
  and genuine error states remain concise.

Validation for this correction:

- Focused reporting checks: 67 passed; 11 opt-in SQL tests skipped on the host.
  The container run executes those SQL tests: 17 passed including protected routes.
  Coverage includes one-statement projection, timezone boundaries, call isolation,
  actual changes, partial-failure retention/recovery, lease fencing and reconnects.
- Fresh temporary database: all 166 migrations applied and replayed without an
  additional journal entry. Migration `0165` was also applied to the local `db`
  container and both new tables were verified there.
- Live GA four-stage query: accepted; returned no data and zero users for all four
  stages on 2026-10-06. This proves API acceptance, not a consenting user journey.
- Latest host typecheck passed. Lint has zero errors and twelve existing warnings.
  Architecture/form checks passed for 1,539 sources; file-size check passed for
  2,249 handwritten files.
- Full-suite run before the final map/funnel changes: 2,643 passed, 235 skipped,
  and the same three resource-thumbnail/CMS-navigation failures. The affected
  reporting checks were rerun after the final changes.
- Final production container build passed compilation, TypeScript, static-page
  generation and image export. The local application and scheduler were recreated
  and both report healthy. The authenticated reporting processor returned HTTP 200;
  the scheduler persisted eight `d1-v2` source snapshots in the existing database,
  including the four-stage application funnel. Sources currently contain empty
  results; starter completion is unavailable because its denominator is zero.
- The live call-engagement query returned HTTP 400 for the unregistered
  `funding_call_id` custom dimension. Register that event-scoped parameter in GA
  before accepting this panel; the other source snapshots are independent.
- Chromium verification remains blocked by missing system libraries; mocked
  MapLibre lifecycle checks and real Recharts DOM checks are not browser acceptance.

## Compact filters and map presentation follow-up

- `FormDateInput` accepts the existing `compact`/`default` control-size contract.
  The From/To filters use the compact 32px control, padding and calendar trigger.
- The funnel, traffic and geography charts each use a 210px plotting area.
  Their grid stretches the cards to the same row height. The geography data table
  was removed at the user's request.
- The initial MapLibre integration omitted its worker URL. Controls could appear
  while the GeoJSON worker failed to load. The app now copies both installed
  worker/shared modules before dev/build and sets their versioned public URL
  before constructing a map, following the
  [MapLibre installation guidance](https://maplibre.org/maplibre-gl-js/docs/).
  Map source/worker errors show a concise unavailable state.
- Focused checks passed: 29 tests across five files, including compact calendar
  interaction, geography-table removal, native Recharts empty charts, worker URL
  ordering, MapLibre updates/cleanup and source error handling. Both generated
  public modules match the installed package byte for byte. Architecture/form
  checks passed. Browser launch is blocked by missing `libnspr4.so`; these checks
  do not establish browser acceptance.

## ECharts replacement and taller charts

The user's later ECharts request supersedes the Recharts/MapLibre implementation
and its 210px sizing described in the historical validation entries above.

- Apache ECharts 6.1.0 replaces all chart-library imports, including the existing
  application-status dashboard ring. The shared component uses the SVG renderer,
  resizes with its container, updates options without rebuilding, and disposes on
  unmount. Recharts, MapLibre and D3 dependencies and the generated worker-copy
  setup were removed.
- Funnel, traffic and geography plotting areas are now 360px high. The cards
  stretch to equal row heights. The geography data table stays removed.
- Visitor geography follows the official
  [geo-choropleth-scatter example](https://echarts.apache.org/examples/en/editor.html?c=geo-choropleth-scatter):
  native map and scatter series share one Namibia geo projection. Region shading
  and scatter sizes use saved regional visitor totals. Scatter points use ECharts'
  derived region centres and only appear for positive recorded counts. Unknown
  regions are not assigned invented locations. All fourteen sourced boundaries
  render with empty data; recorded zero remains distinct from unknown data.
- Focused validation: 35 affected tests passed across seven files (34 in the
  combined run, then the updated eight-test native-rendering file passed). These render actual
  ECharts SVG for the empty/populated four-stage funnel, traffic axes/legends,
  eligibility ring, and the fourteen-region empty map with measured scatter
  markers and full-country fit. Native refresh checks preserve user zoom while
  updating visitor counts. Shared lifecycle checks cover registration before
  initialization, updates, resize and disposal. Dashboard and compact-date controls also passed.
  Browser acceptance remains unverified because Chromium requires unavailable
  system libraries.
- Final production build passed compilation, TypeScript, all 89 static pages
  and build tracing. Standalone type checking passed after the build. Lint passed
  with zero errors and thirteen existing warnings
  outside the chart changes. Architecture/form checks passed for 1,541 sources;
  file-size checks passed for 2,251 handwritten files. Dependency/lockfile checks
  confirmed ECharts 6.1.0 and removal of the previous application chart libraries.

## Native chart treatment and independent geography follow-up

This supersedes the shared three-card row described in the previous entry.

- Funnel and traffic retain equal 360px plotting heights in a two-column row.
  Visitor geography now occupies its own full-width row with a 560px plot.
  ECharts fits and centres Namibia while preserving geographic proportions;
  assigning all four geo margins previously stretched the country to the panel.
- All chart series use the canonical brand navy, blue, gold, orange, green and
  cream palette. The dashboard ring uses matching brand colours for its legend.
- The four-stage funnel uses native rich labels, real counts, callout lines,
  separate coloured stages and hover emphasis. Empty geometry preserves the
  stage structure while displaying real zeros and disabling fabricated tooltips.
- Traffic uses native legends, crosshair tooltips, shaded series, a zoom slider
  and restore/export controls. Eligibility uses native percentage labels and a
  counted legend. Geography uses region labels, hover emphasis and a continuous
  brand-coloured scale with orange scatter markers for measured regional totals.
- Twenty focused tests passed across five files, including actual SVG rendering,
  map fit, a wide-panel geographic aspect-ratio regression, refresh/zoom retention,
  the shared chart lifecycle and dashboard presentation. Standalone type checking
  passed. Lint completed with zero errors and thirteen existing warnings.
  Architecture/form and file-size checks passed for 1,543 sources and
  2,253 handwritten files respectively. Browser acceptance remains unverified.

## Outstanding acceptance

GA read access and the configured property timezone are verified. Remaining
provider settings and Clarity capture still need live acceptance. Acceptance
requires a consenting start/submit journey and
cross-call control sample; observed GA region-name samples and agreed alias/share
limitations; actual provider/API dashboard results; Clarity masking and private
navigation checks; authenticated desktop/mobile/keyboard review; and resolution
of the unrelated repository-wide gate failures. No written live acceptance is
claimed. Do not begin R1 on the basis of this implementation record alone.

## Public heatmap capture scope follow-up — 2026-10-07

Scope: the requested D1 public-page capture rules from lines 211–216 of the
implementation plan. Implementation is reviewable; live provider and browser
acceptance remain pending.

- Reused `ClientClarityService` and the existing consent interface. Both the
  accepted UI choice and the stored consent cookie must permit collection.
  Consent, the exact approved URL and safe page content are checked again after
  the asynchronous SDK import; withdrawal or navigation cannot start stale capture.
- The approved routes are `/`, `/about`, `/how-to-apply`,
  `/how-to-apply/funding`, `/funding`, `/news`, `/events`, `/resources`, `/faq`,
  `/terms`, `/privacy`, and public funding-call detail routes with valid UUIDs.
  Authentication, applicant, operations, CMS, contact and eligibility/application
  form routes, unknown routes, query strings and fragments remain excluded.
  Same-origin private/form referrers and referrers containing queries/fragments
  also prevent capture.
- Body masking is applied before SDK startup. Text/image masking, form and
  editable-content selectors are configured with no unmask selectors.
  Pages requesting unmasking are rejected, and newly added unmask attributes or
  content stop capture. Form focus/input/submission/pointer interaction stops
  capture before field handlers run, including public newsletter controls.
- History changes, navigation links, back/forward, fragment changes and page
  exit stop capture. Returning to a tab checks stored consent. The pinned
  `clarity-js` 0.8.71 SDK is stopped before calling its consent-denial API,
  preventing the SDK's active denial path from scheduling a recording restart.
- Consent wording now explains masked click/scroll capture and the excluded
  applicant, staff and CMS forms. SDK access stays inside the frontend service.
- The earlier provider-link description is superseded by the current dashboard:
  the heatmap panel sits beside eligibility self-checks, has no external link,
  and reports unavailable. This capture change does not supply an inline heatmap.

Validation: 67 focused tests passed across `ClientClarityService`,
`WebsiteAnalyticsCollection` and `AnonymousEligibilityCollection`. Changed-file
lint and standalone type checking passed. Tests use isolated DOM windows and a
mocked SDK; they verify route/consent exclusions, masking configuration and
ordering, form/navigation handlers, asynchronous import cancellation and the
denial/restart regression. They do not establish actual provider payload masking.
Architecture/form boundary and file-size checks passed. The installed Chromium
cannot launch because `libnspr4.so` is missing, so browser and live Clarity
acceptance remain unverified. No production build or full-suite run was performed
for this focused follow-up.
