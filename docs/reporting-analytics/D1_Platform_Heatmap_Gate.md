# D1 platform-owned click and scroll heatmaps

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
