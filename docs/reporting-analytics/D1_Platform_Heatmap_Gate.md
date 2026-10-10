# D1 platform-owned click and scroll heatmaps

## Update: automatic anonymous heatmap capture, 10 October 2026

At the user's request, heatmap recording no longer requires analytics consent.
This update supersedes the consent and withdrawal requirements in the original
7 October record below. Google Analytics retains its own existing cookie choice.

The public layout mounts heatmap recording independently of the consent banner.
Browser capture, uploads and the public API accept recordings without a consent
cookie, including when Google Analytics is declined. The approved-public-route
allowlist, form masking, geometry-only payload, feature flag, same-origin checks,
bounded requests and staff report permission remain enforced. The dashboard
tooltip and scroll chart describe recorded views; the empty panel provides a
Refresh button and instructions for checking new public-page recordings.

The changed heatmap/reporting backend services now live in the module's
`application` directory, and the scroll-depth count table uses shared `DataTable`.
No database migration is required. No production build was requested or run.
Browser and deployed-runtime verification have not been performed for this update.

Validation: 89 distinct focused tests across 12 files passed, covering browser
capture, upload transport, no/declined consent, public-route and form exclusions,
same-origin/feature-flag enforcement, staff permissions, charts, presentation,
and retained Google Analytics/eligibility consent. The final rerun used a
30-second test timeout because two dynamic-import tests exceeded five seconds
under local memory pressure. Type checking, architecture/form boundaries,
component reuse, file-size limits, changed-file lint and whitespace checks passed. Full-repository
lint reports one unrelated error at
`modules/chatbot/ui/public/useVisitorChatbot.ts:110` (`react-hooks/purity`);
that existing chatbot work was preserved.

Engineering review: Codex, 10 October 2026. The focused implementation and
regression evidence are accepted; deployed/browser acceptance remains pending.

## Original implementation record

Date: 2026-10-07.
Status: implementation and local PostgreSQL verification complete; browser,
deployed application and performance acceptance remain pending.

## Delivered behavior

- The dashboard panel beside eligibility self-checks now displays native click
  hotspots over captured masked page-layout geometry, and scroll-depth shares
  with a count table. Page/layout selection respects dashboard dates and funding
  call scope. Saved results are available when new capture is disabled.
- Capture requires explicit analytics consent and an approved public route.
  Authentication, applicant, staff, CMS, contact, eligibility and application
  form routes, unknown routes and query/fragment URLs are excluded.
- Captured data contains public route, viewport width, document height, numeric
  layout boxes, click cells and maximum visible page depth. Form controls and
  `[data-heatmap-mask]` subtrees are excluded. Text, images, screenshots, form
  values, arbitrary attributes, referrers and persistent visitor IDs are absent.
  A random view ID exists only for one captured layout and deduplicates uploads.
- Clicks include outbound navigation interactions before capture stops. Scroll
  depth includes the initial viewport, rises through ten-percent milestones,
  and never decreases in storage. Layout geometry/viewport changes create a
  separate view; stored layout hashes keep incompatible layouts separate.
- Strict public POST validation checks bounded JSON, exact consent, same-origin
  context and the approved route. Staff GET uses `reporting.website.read.all`
  before repository access. Multi-record writes are transactional; repeated
  sequences do not double-count, and view IDs cannot cross layouts.
- Microsoft Clarity code, dependency, lockfile entry and environment setting are
  removed. Current provider access does not require an external account.

## Performance bounds

- Layout capture runs during idle time and examines at most 500 elements,
  retaining at most 80 geometry boxes. No HTML serialization or screenshot work.
- Scroll listeners are passive; a burst schedules one check per 250 ms.
  Each view retains at most 200 clicks. Regular uploads occur in idle batches
  every ten seconds when there is unacknowledged data, with one normal request
  in flight and a five-second client timeout. Failed batches retain their view
  and sequence numbers for bounded retry. Page exit uses a best-effort beacon.
- Collection does not block navigation, form handlers or rendering. Upload
  errors remain isolated from product flows. Capture stops on withdrawal or
  private navigation and cancels its timers/listeners.
- Requests are capped at 32 KiB. Writes have a two-second statement timeout and
  250 ms lock timeout. Reports use one SQL projection, indexed date filtering,
  at most 50 layout choices and at most 2,500 aggregated click cells.
- These bounds are verified by code/tests. They do not establish zero overhead
  or browser performance acceptance.

## Verification and activation

- 56 focused tests passed across capture, service, transport, native SVG charts,
  reporting authorization and dashboard presentation. Changed-file lint,
  standalone type checking, architecture/form and file-size checks passed.
- Actual PostgreSQL 16 checks ran the repository in a temporary schema: migration
  repeatability, retry deduplication, maximum depth/cohort shares, layout
  isolation, local-date/call filters, 50-layout bounds and transactional rollback
  passed. Temporary schema and container script were removed.
- Migration `0167_website_heatmaps.sql` was applied to the local development DB.
  Local `.env` enables `WEBSITE_HEATMAP_ENABLED=true` and removes the old Clarity
  setting. Other environments must apply the migration before enabling capture.
- A broader reporting run had 128 passed and one existing failure in
  `WebsiteAnalyticsMetricCards.test.tsx` expecting “Comparison unavailable”.
  Its implementation/test were unchanged by this task. The final additional
  retry regression passed in the focused run; no repository-wide green claim.
- Installed Chromium remains blocked by missing `libnspr4.so`. Native ECharts
  SVG and isolated DOM tests are not browser acceptance. The running application
  container was not rebuilt or redeployed; no production build was requested.
  Capture/API/browser performance must be verified after deploying this code.

This record supersedes the Clarity capture and unavailable inline-panel behavior
in the earlier [D1 record](D1_Implementation_Gate.md). The
[implementation plan](../SME_Fund_Reporting_Analytics_Implementation_Plan.md)
now specifies platform-owned capture/storage/display.
