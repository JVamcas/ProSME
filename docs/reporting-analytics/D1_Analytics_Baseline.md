# D1 Website Analytics Baseline

Recorded from the existing analytics plan on 2026-10-08. D1 remains the
accepted analytics baseline; this document records its existing requirements,
not a new implementation or renewed live acceptance.

The current reporting rebuild is defined in
[the implementation plan](../SME_Fund_Reporting_Analytics_Implementation_Plan.md).
It preserves D1 collection, stored aggregates, synchronization and dashboard UI.
The old website-report pages, schedules and delivery design are superseded.

## Existing ownership and synchronization

D1 remains under `src/modules/reporting` inside `apps/platform`, with its page
at `/admin/analytics/website`, browser reads at `/api/reporting/website`, and
heatmap reads at `/api/reporting/website/heatmap`. Backend services enforce
permissions before repositories read the stored sources. Google credentials
remain server-only; browser measurement configuration stays environment-owned.
The existing processor currently combines website-report generation and D1
synchronization. Removing the former must retain the latter and its scheduler
health response.

## D1 visual and brand contract

![D1 layout reference with illustrative data](d1-website-analytics-reference.png)

Use this latest, denser reference: six metric cards; funnel, traffic and Namibia
geography row; journeys, pages and call engagement row; eligibility and platform
heatmap/scroll-depth panels side by side. Dates, counts, labels and heatmap thumbnail are illustrative, not production
data. The sidebar in the current implementation plan supersedes the image's
expandable analytics parent. Preserve its contrast and density, with responsive stacking on small screens.

Canonical palette: `apps/platform/src/shared/ui/brand-tokens.css` and
`brand-theme.css`. Use CSS variables and existing variants, not copied image hexes.

| Token | Current value | D1 use |
| --- | --- | --- |
| `brand-navy` | `#0a183b` | Sidebar, headings, readable text and chart outlines |
| `brand-blue` | `#6baed6` | Main traffic series, map selection and chart accents |
| `brand-gold` | `#c9a24d` | Second series and secondary chart categories |
| `brand-orange` | `#ff6f00` | Existing action/icon accents and selected emphasis |
| `brand-yellow` | `#ffca45` | Supporting category/highlight where contrast permits |
| `brand-green` / `brand-green-soft` | `#16a34a` / `#a8dfbc` | Eligible/completed semantic states |
| `brand-white` / `brand-cream` | `#ffffff` / `#f6f4e2` | Cards and page surfaces |

The subsequently approved KPI reference uses compact white cards, muted labels
above values, upper-right blue/violet icon tiles and real previous-period changes.
For those tiles use the existing Tailwind blue/violet palette; this supersedes the
earlier instruction to replace those accents. Keep canonical tokens for the rest
of the dashboard. Reuse
`GeneralButton`, shared tables, form controls, skeletons, badges, page shell and
navigation. Evaluate `DashboardMetricCard` for a compact variant; move a touched
domain-neutral primitive into `shared/ui` when required, without copying it.
Charts need labelled values/legends and accessible text or table equivalents.

Core totals use GA Data API; ordered funnels use the funnel API behind the same
adapter. Validate actual API capabilities before binding panels. Bound rows,
date ranges and external concurrency. D1 persists completed aggregates in dedicated
tables in the existing PostgreSQL database, rather than depending on a live GA
request or process-local cache when the dashboard is opened. Raw visitor events
remain in GA. Store each exact property, timezone, date range and funding-call scope;
do not sum daily distinct-user counts or reconstruct ordered funnels from daily totals.

`app_reporting_website_queries` records requested report scopes, refresh deadlines
and bounded worker leases. `app_reporting_website_source_snapshots` retains the last
successful result for each source independently. Background synchronization updates
successful sources and records failures without overwriting previous aggregates.
The dashboard uses one consolidated SQL projection for stored sources, SQL eligibility
totals and previous-period changes. Authorization precedes all repository access.
Show pending, stale and unavailable states honestly, with source refresh timestamps.
Only compare an equal-length previous period when collection covered that period;
missing reports and zero comparison denominators do not become fabricated percentages.

### D1 files and panel responsibilities

All listed UI files live under `reporting/ui/website`. Each chart is its own
component in its own file. Chart components receive typed data; they do not fetch,
authorize, parse responses or calculate business metrics inside JSX.

| File | Responsibility |
| --- | --- |
| `WebsiteAnalyticsWorkspace.tsx` | Compose filters, query state and panel grid |
| `WebsiteAnalyticsFilters.tsx` | Date range, funding call and shared Refresh control |
| `WebsiteAnalyticsMetrics.tsx` | Compose six instances of the reused metric card |
| `WebsiteTrafficChart.tsx` | Daily page-view/session series, axes, legend and tooltip |
| `WebsiteApplicationFunnelChart.tsx` | Four ordered call-view/check/start/submission stages with native labels |
| `WebsiteVisitorGeography.tsx` | Compose regional map with region count selection; no geography table |
| `NamibiaVisitorMap.tsx` | Interactive Namibia regional map with hover/focus detail |
| `WebsiteVisitorRegionsTable.tsx` | Regional visitors, share and unknown coverage |
| `WebsiteUserJourneys.tsx` | Top observed public-page sequences ranked by tracked users |
| `WebsiteMostViewedPages.tsx` | Ranked, bounded page-view table |
| `WebsiteFundingCallEngagement.tsx` | Call views and consistently labelled start/submission measures |
| `WebsiteEligibilityChart.tsx` | Anonymous self-check outcome donut and legend |
| `WebsiteHeatmapPanel.tsx` | Platform-owned click hotspots over masked layout geometry and scroll-depth shares; filter by captured layout and dashboard date/call scope |
| `useWebsiteAnalytics.ts` | TanStack query keys, cancellation, caching and refresh |

Use Apache ECharts through the shared SVG chart component for every chart,
including the dashboard status ring. Use its native four-stage funnel, traffic
lines and eligibility ring. Visitor geography follows the `geo-choropleth-scatter`
example with one Namibia geo projection shared by the map and scatter series.
Shade regions by their recorded user count; place scatter markers at derived
region centres only for positive recorded counts. These markers represent region
totals, not individual visitor coordinates. Retain the sourced fourteen-region
GeoJSON and attribution. The funnel and traffic plotting areas are 360px high
in a shared two-column row. Geography occupies its own full-width row with a
560px plotting area; fit the country while preserving its geographic proportions.
The geography table is omitted. Use the canonical app navy, blue, gold, orange,
green and cream palette. Funnel labels/counts, legends, tooltips and traffic
zoom/export controls belong to ECharts. Keep chart explanations and source details
in the shared information tooltip rather than visible caption paragraphs.
Search for compatible wrappers before creating
chart framing or theme helpers. Store an accurately sourced, reusable Namibia
boundary asset separately; record its source/licence and verify regional keys.
The generated map is a layout illustration, not authoritative boundary geometry.

Target components/services below 200 lines, pages/routes below 100, functions
below 80 and tests below 250. Split before reaching those working targets. Respect
AGENTS hard limits and the stricter current file gate (400 implementation/300 test
lines); never compress code to pass. Split provider queries by responsibility and
scheduled generation from schedule administration. No all-charts file.

### D1 metrics and collection

Six cards: visitors, page views, average session duration, application starts,
applications submitted and starter completion rate. Define visitors as GA
`totalUsers`; use `screenPageViews` and `averageSessionDuration` for traffic.
Define start/submission cards as tracked users reaching those steps and label
them accordingly; they are not PostgreSQL application totals. Completion uses
ordered funnel users submitted / users started; no denominator means unavailable.

Track `funding_call_view`, `call_document_download`, `eligibility_check_complete`,
`application_start` and `application_submit`. Register funding-call/page-category
dimensions. Fire successful start/submission signals after server confirmation,
deduplicate retries/rerenders and keep tracking continuous across public/auth/portal
navigation. The subsequently approved application funnel has four ordered stages:
Funding Call View, Eligibility Check Completed, Application Started and Application
Submitted. Query that exact sequence; use contract `d1-v2` so older three-stage
stored results cannot be displayed as four-stage results. Every call-filtered
funnel step uses the same call scope; validate cross-call sessions explicitly.

Use consent-aware browser tracking through `ClientWebsiteAnalyticsService.ts`;
components/hooks must not call Google SDKs directly. Send only approved event
metadata; sanitize page URLs/referrers and omit applicant identifiers, answers,
free text, documents and reviewer information. Heatmaps capture approved public
pages with masking, not applicant/staff/CMS forms. Heatmap capture, storage and
rendering are platform-owned; Microsoft Clarity is removed. Capture only numeric
geometry, click cells and maximum scroll depth after explicit consent. Never
capture DOM text, images, form values, attributes or visitor identities. Separate
viewport sizes and captured layout versions. Bound traversal, payloads and event
counts, use passive throttled listeners and idle batched uploads, and aggregate
in SQL. `WEBSITE_HEATMAP_ENABLED=true` enables collection after migration 0167;
saved data remains viewable when collection is disabled. GA does not supply heatmaps.

Geography displays Namibia and its 14 regions, filtering GA country to Namibia.
Verify IP-derived region names against live results; do not use business-profile
regions to describe website visitors. Preserve unknown/unmapped/thresholded data.
Other panels remain website-wide unless explicitly filtered; label that difference.
Distinct users can appear in multiple calls or regions: do not force grouped counts
to sum to site-wide users. Agree and label the regional-share denominator.

Journeys show the top three observed sequences of two or three public-page steps, ranked by tracked users, with readable labels and arrows. Authentication and portal activity are excluded; the public Start application handoff is an endpoint. Empty, failed and stale sources remain explicit.
Prove the available API query for each; arbitrary GA path exploration is not assumed.
Log anonymous self-check outcomes, call/ruleset version and timestamp in PostgreSQL;
retain only approved non-identifying assessment categories, never raw free text or
account/session/IP identifiers. Aggregate in SQL. Keep advisory results separate
from formal eligibility decisions. Test that logging failure cannot block guidance.

Every panel distinguishes loading, no data, unavailable, failure and stale data.
Expose collection start, source coverage and relevant GA thresholding/sampling.
Keep successful panels usable when another source fails. No demo data in production.

