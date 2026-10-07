# Public route performance investigation

Date: 7 October 2026. The initial investigation made no implementation changes.
The image remediation follow-up below records the subsequent focused change.

## Findings

The largest reproduced local delay is cold CMS image delivery. Warm HTML is
fast locally. The deployed site also shows variable HTML response delays beyond
connection setup, but its database/process cause cannot be identified through
public HTTP requests alone. Server rendering is confirmed; it is not sufficient
evidence to attribute all of the observed slowdown to rendering.

[Sanitized observations](public-route-performance-evidence/2026-10-07.json)
record the measurements, query counts, and storage-call timings. No credentials,
SQL parameter values, page exports, or applicant records are included.

## Runtime and method

- Local target: existing production container at `http://127.0.0.1:3008`.
  It runs `node server.js` with `NODE_ENV=production`; this is not `next dev`.
- Local build ID: `7zgiFd92-Mpv1rE2vLebw`. The workspace's existing build ID was
  different, so runtime measurements were taken from the running image rather
  than assuming the workspace build was deployed.
- Deployed target: `https://www.smefund.na`, supplied by the user.
- Three alternating HTTP rounds covered nine local public pages and a static
  logo. Four deployed pages were sampled three times with fresh connections.
- Additional deployed comparisons used compression and one reused connection
  for static, HTML, and minimal health-probe requests.
- An isolated copy of the local image used port 3018, 768 MiB, and one CPU.
  Temporary Node instrumentation counted PostgreSQL wire statements and timed
  outgoing storage HTTP calls. No application rebuild was performed.
- Driver interception alone did not see bundled CMS queries; wire observations
  supplied CMS statement counts. Individual CMS query durations were not
  measured. Parallel durations must not be treated as elapsed request time.
- Synthetic RSC requests followed Next's validation redirects. These establish
  repeated server work, not actual browser navigation or hydration timings.
- Existing Chromium could not launch because `libnspr4.so` is missing. Browser
  binaries and dependencies were not installed. LCP, INP, browser cache behavior,
  and analytics overhead therefore remain unmeasured.
- The workspace had concurrent user changes, including staged reporting/heatmap
  changes. They were preserved. Those changes are not proven to be in either
  measured deployment.

## HTML response measurements

Local medians include the first route sample and two later samples. The first
homepage probe, before the alternating rounds, took 1,300 ms to first byte.

| Local route | Three time-to-first-byte samples, ms | Median, ms |
| --- | --- | ---: |
| `/` | 126.53, 44.64, 56.94 | 56.94 |
| `/about` | 279.04, 20.34, 18.96 | 20.34 |
| `/faq` | 123.47, 33.83, 23.09 | 33.83 |
| `/contact` | 44.54, 22.01, 18.83 | 22.01 |
| `/resources` | 71.76, 35.73, 24.22 | 35.73 |
| `/news` | 62.45, 25.65, 28.88 | 28.88 |
| `/how-to-apply` | 47.23, 33.88, 17.53 | 33.88 |
| `/how-to-apply/funding` | 84.98, 33.53, 23.09 | 33.53 |
| `/privacy` | 28.31, 22.17, 22.30 | 22.30 |

On the deployed site, fresh-connection first-byte measurements ranged from
1.80 to 12.04 seconds across the tested pages. Those numbers include DNS,
TCP/TLS, network, proxy, and application time; they are not server render times.

Compressed comparisons on reused connections showed:

| Deployed request | Time to first byte, ms, excluding new TLS setup |
| --- | --- |
| Static logo | 358.10, 372.73; later run 308.06 |
| Homepage | 6,128.66, 2,675.12 |
| About | 2,215.79, 1,460.57; later run 1,235.89, 654.72 |
| Resources | 2,517.82 |
| Health: `select 1` | 869.52, 530.85 |

These establish variable dynamic-response overhead relative to a small static
file from the same host. They do not isolate database latency, SQL complexity,
process contention, cold starts, or reverse-proxy behavior in production.

## CMS image delivery: confirmed local bottleneck

The current delivery chain is:

`browser -> /_next/image -> Payload /api/media/file -> GCS metadata -> GCS bytes -> Next optimization -> browser`

`CmsImageDelivery.ts` sends generated variants through `/_next/image`.
The installed GCS adapter's `getFile.js` calls `getMetadata()` before creating
the download stream. The optimizer must consume the source before responding.

First-access observations from the running local app:

| Image | First-access time to first byte | Later sample |
| --- | ---: | ---: |
| Hero variant | Timed out at 25 s; next attempt 12.77 s | Not a clean cold/warm pair |
| Document preview | 17.41 s | 2.76 ms |
| Funding thumbnail | 6.42 s | 2.60 ms |
| Impact background | 17.67 s | 3.14 ms |

The isolated trace reproduced this with one hero source:

- Generated PNG source size: **3,455,073 bytes**.
- Direct source requests: **9.42 s** and **5.92 s** total.
- Outgoing GCS byte transfers: **5.53–10.26 s** across four requests.
- GCS metadata requests: **0.37–1.36 s**. Initial authentication additionally
  took approximately **1.01 s**.
- Optimized PNG response: **11.89 s** first byte, 336,263 bytes.
- Optimized WebP response: **10.10 s** first byte, 46,750 bytes.

The storage download, rather than SQL or compilation, accounts for most of
these isolated cold-image waits. Optimization adds work, but it was not the
largest timed stage.

The deployed hero source was **3,878,980 bytes**. Direct source requests took
28.93 s and 15.04 s total from the investigator's machine. Optimized WebP was
85,074 bytes and responded in 3.36 s and 1.43 s to first byte, including new
TLS setup. The recorded optimized response was a cache **HIT**; these deployed
samples do not measure a cold production optimizer. Direct-source timings must
not be described as the download time of the optimized image seen by a visitor.

The optimized response advertises a four-hour public cache lifetime. The raw
deployed media response had an ETag but no explicit `Cache-Control` header.
Local container mounts persist uploaded media, but do not persist
`.next/cache/images`. The Docker runtime copies standalone/static output into a
new container; it does not preserve the old runtime image cache.

Inference: redeployments, replacement media URLs, new widths, or new formats
can expose the slow storage path again after images previously appeared fast.
No deployment log or prior benchmark was available to prove this was the
specific trigger for the user's latest regression.

## Rendering and repeated reads

Both measured sites returned public HTML with:

`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`

The local prerender manifest contains no public content pages. The public
layout sets `dynamic = "force-dynamic"`; published CMS getters have no explicit
result caching or request memoization.

Wire observations in the isolated instance showed:

- About: **10 SQL statements** for both cold and warm HTML requests. Site
  settings and contact globals are each read twice. About is read separately
  for metadata and content; its Payload count/list work also repeats.
- Homepage: **23 SQL statements** for both cold and warm HTML requests,
  including repeated news/resource/statistics reads. A read-only count found
  one resource-grid block and one statistics block; the duplication should not
  be attributed to duplicate stored blocks without further tracing.
- Successful synthetic RSC requests repeated **10** and **23** statements.
  They returned full RSC responses without a browser's router-state tree, so
  they are not a reproduction of an exact browser navigation request.
- `PublicContentRefresh` requests a refresh immediately after mount/pathname
  changes, every 30 seconds, and on focus/reconnection/history/visibility
  events. Existing unit tests confirm this behavior. It is an unnecessary
  additional source of requests; browser-visible impact remains unmeasured.

## History and corrections to the earlier explanation

- `c2263399`, 19 September: changed the public layout from `force-dynamic` to
  `revalidate = 300`, and added `SKIP_CMS_PRERENDER=1` plus build placeholders.
- `fb08c0ec`, 29 September, "public site refactor": restored `force-dynamic`
  and introduced `PublicContentRefresh`. The comment explicitly protects
  against caching build placeholders.
- `ad0e7b72`, 4 October, "cms in progress": replaced direct, unoptimized CMS
  image delivery with generated variants routed through Next's optimizer.
  This introduced an additional cold optimizer stage; it is not proof that
  the old original-image delivery was faster.
- The 4 October responsiveness plan explicitly covered portal/operations and
  left public CMS pages for separate review.

Earlier replies treated the rendering-settings change as the cause of the
reported regression without measurements. That was too definitive. The change
is real, but the largest reproduced local delay is media transfer. Production
also has HTML delays whose internal cause remains unconfirmed.

Earlier replies also generalized draft-mode checks as a static-rendering
blocker. In the installed Next implementation, reading `draftMode().isEnabled`
can return an empty draft mode during prerendering. That read alone is not proof
that a public route must render dynamically. Preview authorization and cache
separation still require review before changing route behavior.

Simply restoring `revalidate = 300` is unsafe as a complete fix: the build uses
placeholder CMS data and a dummy database connection. A change must ensure
cached pages are populated from real published data and correctly refreshed.
Relevant framework references: [caching](https://nextjs.org/docs/app/guides/caching-without-cache-components),
[draft mode](https://nextjs.org/docs/app/api-reference/functions/draft-mode),
and [image cache behavior](https://nextjs.org/docs/app/api-reference/components/image).

## Recommended bounded follow-up

1. Fix the confirmed image path first: reduce generated source bytes, evaluate
   delivery of already-generated variants without a redundant cold transform,
   and ensure cache persistence/delivery covers redeployments. Preserve private
   storage and existing public-media access semantics. Do not make the bucket
   public as a shortcut. Measure cold and warm image delivery afterward.
2. Remove routine full-route refresh polling and deduplicate identical CMS
   reads. Verify CMS publish/unpublish and preview behavior explicitly.
3. Add published-content/page caching with event invalidation after fixing
   build-placeholder handling. Funding dates, pagination, previews, and
   user-context operations need their own freshness/authorization checks.
4. Obtain production process/DB timing to explain the remote HTML delay, and
   perform real browser navigation/LCP checks with an existing working browser.

## Image remediation follow-up: 7 October 2026

Follow-up item 1 is implemented in source and measured against local CMS/GCS
data. Production deployment and production media regeneration remain pending.

- Payload now generates WebP variants at quality 75, with the same four widths
  and no enlargement. Original uploads retain their original bytes and MIME
  types. Raster delivery requires generated WebP variants, including small
  originals; there is no PNG/JPEG/original or optimizer compatibility fallback.
  SVGs retain native vector delivery.
- The responsive image loader returns generated variant URLs directly through
  `/api/media/file`, including the existing UUID prefix. Public images,
  rich-text uploads and CMS guide previews use that same variant contract.
- A bounded persistent delivery cache wraps the existing GCS file handler.
  Payload's file-access check runs first on every request, including hits.
  Cache hits require its current media document, a matching UUID prefix and
  a generated WebP filename. Keys include the bucket/environment namespace and
  document revision. Missing, superseded or mismatched documents cannot use
  the cache. Range requests still delegate to GCS; errors, originals,
  documents, SVGs and non-WebP files are not cached by this wrapper.
- Successful generated-image responses advertise the existing four-hour
  public cache lifetime and retain ETags. The cache stores complete bytes using
  atomic replacement, coalesces concurrent misses and is bounded to 2 MiB per
  entry, 128 MiB total and 512 entries. Cache failures fall back to storage.
- Compose now mounts separate named volumes for `.next/cache/cms-media` and
  `.next/cache/images`. Docker prepares both directories for the existing
  non-root runtime user. Normal app-container replacement retains these
  environment-scoped volumes. Removing volumes, changing the Compose project,
  or moving to a host without the volumes requires cache warming again.
- Storage remains accessed through the authenticated GCS adapter. No public
  bucket/ACL/IAM change or browser-facing GCS URL was introduced. The existing
  public media read policy and protected write policy remain intact.

The updated repeatable `cms:migrate:media` command regenerated **eight local
raster records**, preserving IDs, content references and original bytes. It
verified the original and generated objects before removing superseded copies.
One PDF was skipped. No database schema change was needed.
An immediate repeat migrated zero records, skipped all nine and reported zero
failures.

[Sanitized image remediation evidence](public-route-performance-evidence/2026-10-07-image-remediation.json)
records the following local HTTP measurements. The isolated server ran current
source in **Next development mode** on port 3018; compilation and initial media
API startup were completed before image sampling. These are storage/delivery
checks, not a production-to-production performance comparison. The original
investigation used an older production container. Cold means a missing delivery
cache entry; warm means the identical URL and bytes returned from that cache.

| Image / generated size | Previous source bytes | WebP bytes | Reduction | Cold TTFB, ms | Warm TTFB, ms | After process restart TTFB, ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Hero / desktop | 3,455,073 | 66,642 | 98.07% | 4,006.26 | 58.53 | 69.27 |
| Document preview / mobile | 197,012 | 45,324 | 76.99% | 1,827.42 | 37.65 | 25.90 |
| Funding thumbnail / thumbnail | 117,310 | 23,792 | 79.72% | 1,518.73 | 17.31 | 23.58 |
| Impact background / desktop | 3,024,435 | 151,604 | 94.99% | 1,895.34 | 44.05 | 24.31 |

All cold responses reported `MISS`; all warm and restarted-process responses
reported `HIT`, with identical SHA-256 hashes and byte counts. Restart reuse was
measured with the same disk directory; actual production container replacement
was not performed. The Compose mounts were validated separately from the
resolved configuration. Cold GCS metadata/download latency is still present;
the change reduces transfer bytes and removes the request-time transform.

Live local access checks returned 403 for a wrong prefix, a superseded prefix
and an anonymous write. Conditional delivery returned 304 and a byte range
returned 206 with the requested 16 bytes. Payload's existing HTTP media endpoint
returned 404 for HEAD; this change does not add a HEAD route.

Validation: **48 focused test files / 395 tests passed**, including migration,
direct responsive delivery, CMS previews, persistent cache, concurrency,
conditional/range handling, corruption, eviction and preserved access settings.
Architecture and form architecture passed. Type checking passed after the image
change; the final repeat was blocked by concurrent reporting pages importing
three not-yet-created UI modules (`WebsiteReportSettingsWorkspace`,
`WebsiteReportDetailWorkspace` and `WebsiteReportsWorkspace`). Changed-file lint
passed; full lint completed with zero errors and 13 unrelated warnings before
the later concurrent reporting additions. The repository file-size gate was
blocked by the concurrent, untouched
`NotificationSeedConfiguration.ts` at 408 lines against its 400-line gate limit;
the files changed for image delivery are within their limits. No production
build, Docker rebuild/redeployment, full application test suite or browser/LCP
verification was performed. Deployment acceptance remains open.

For each deployment environment, use the updated migration runner to regenerate
all existing raster records before switching to the WebP-only application.
Require zero migration failures, then retain the two cache volumes across app
replacement. Recheck actual production cold/warm requests after deployment.
Local regeneration does not update production's environment-scoped objects.

## Initial investigation validation and limits

- Focused existing refresh/image tests: **3 files, 27 tests passed**.
- Architecture boundaries: **passed for 1,585 source files**.
- Combined architecture command: **failed** at the form gate on the concurrent
  reporting file `WebsiteHeatmapPanel.tsx` (form not submitted through React
  Hook Form). This investigation did not modify that file.
- No application implementation files were changed. No production build,
  dependency installation, full test suite, lint, or typecheck was run for this
  documentation-only investigation. No completed implementation gate is claimed.
- The temporary profiler was removed after measurement. Original app/database
  containers and user changes were preserved.
