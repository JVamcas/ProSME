# Public Website CMS — Phase 2 gate record

Date: 2026-09-29

## Implemented

- `/cms` presents a Home entry and `/cms/home` lists the visible Home sections in public order. The guide shows current copy, available images, draft/live state, preview and live links, section editor links, related entries, and shared header/footer ownership. The operations funding-call link appears only with operations access.
- The Home hero, action cards, funding-call slogan, process steps, support introduction, news introduction, and Impact campaign message now use Payload fields. Action destinations, application status labels, and navigation controls remain code-owned.
- Home news and resources use at most two published items of each type, ordered by publication date or creation date with ID as a stable tie-breaker. Missing items remain missing. Legacy resource-grid `limit` and unused Homepage controls are hidden.
- Payload migrations add the new fields and backfill process steps for existing Home versions. A follow-up migration repairs the versioned step table name on databases that ran the first migration and covers the Impact field on shared page blocks. The seed uses the same visible copy as before. Payload types and import map were regenerated.
- Draft preview has a visible indicator and Exit preview control.

## Verification

- Architecture and form architecture checks passed for 1,185 source files. File-size checks passed for 1,651 handwritten files. Type checking and lint passed; lint reported 18 warnings.
- Eleven focused Home guide, rendering, and feed tests passed. The full suite completed with 1,491 passed, 80 skipped, and 14 failed across unrelated form, workflow, badge, and navigation tests. It is not a passing repository test gate.
- The production build passed with the `/cms/[[...segments]]` route.
- The local Payload repair migration was applied through the normal migration runner. The local content seed then completed successfully with the rebuilt migrations image. Desktop/phone screenshots, authenticated CMS navigation, draft/publish and unpublish checks, version recovery, and a nontechnical editor walkthrough remain to be recorded.

## Acceptance

Written editorial acceptance is pending. Phase 2's exit gate remains open until the live CMS walkthrough, screenshots, and full repository test gate are accepted.

## Sidebar-only follow-up (2026-10-04)

The requested scope was narrowed to an incremental sidebar cleanup. Home Page
is now the only sidebar navigation item. A content-owned adapter reuses Payload's
native navigation with an empty sidebar entity list, preserving the branded
identity, sign-out control, responsive toggle, and editor access rules. Existing
collection/global editors remain reachable from the Home guide and their URLs.

The Payload import map was regenerated. Architecture and form-architecture
checks, file-size checks, type checking, and lint passed (14 existing warnings).
Six focused navigation, Home guide, and logout tests passed. The full-suite
baseline taken before this sidebar change passed: 2,327 tests, with 209 skipped.
This follow-up does not constitute Phase 2 editorial acceptance; the remaining
Home work and authenticated walkthrough are deferred to subsequent steps.
The production build passed with compilation warnings. The running Docker
application was not rebuilt, and signed-in browser validation was not performed
for this sidebar-only change.

## Shared sidebar structure follow-up (2026-10-04)

Investigation found that the CMS used separate brand/identity markup and
independent sidebar styles. Matching palette values alone did not preserve the
operations sidebar's header, account area, scroll region, or pinned footer.

Both adapters now compose `NavigationSidebar` and its focused shared header,
user-summary, navigation-item, logout, and resize components under
`src/shared/ui/navigation`. The CMS's duplicate brand component and sidebar
styles were removed. Home Page remains the only CMS navigation item. Desktop
collapse, the 80-pixel icon rail, and bounded resizing use the shared controls;
Payload retains ownership of mobile drawer state and its editor layout. The
CMS Firebase logout integration remains separate from the portal Query hook.

Architecture/form boundaries, file-size checks, type checking, and lint passed
(14 existing warnings). All 21 focused sidebar/portal/logout/guide tests passed.
The full suite passed with 2,332 tests and 209 skipped. A local Chromium fixture
compared the shared presentation with and without Payload's CSS, including the
native CMS navigation wrapper: header, identity, scroll region, footer geometry,
and background colour matched. This is component-rendering evidence, not an
authenticated editorial walkthrough or Phase 2 acceptance.

## CMS header and fluid content follow-up (2026-10-04)

The duplicate white Payload collapse control is hidden while the CMS sidebar is
open. The shared sidebar control remains available, and Payload's reopen control
and mobile drawer state are preserved. The CMS header uses shared app-header
styling, a visible CMS label, and the same initials avatar as the portal header.
Payload continues to render its breadcrumb, account link, and editor actions.
The Home guide's 1,040-pixel maximum width was removed; it now fills the content
area with responsive padding.

Local Chromium fixtures verified desktop and phone header heights, full-width
Home content, no horizontal overflow, and the native toggle's open/closed
visibility. These fixtures do not replace signed-in editorial acceptance.
The running application was not restarted, as requested.
