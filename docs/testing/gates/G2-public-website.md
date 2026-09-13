# Gate G2 — Public Website Record

## Gate status

| Field | Value |
| --- | --- |
| Gate | G2 — M4 website accepted |
| State | Passed |
| Evidence date | 12 September 2026 |
| Acceptance authority | Client content owner and client project authority |
| Acceptance | Accepted |

G2 passed after Phase 2 engineering, full local validation, live authorization verification, and the accepted content, design, accessibility, responsive, and photography reviews were recorded. The client content owner and client project authority confirmed acceptance on 12 September 2026.

## Implemented scope

- The Option B header is orange with a white SME Fund logo and a persistent white secondary navigation row.
- Public calls to action use Apply Now, Check My Eligibility, and Track Application.
- Public copy uses MSME except in the SME Fund and ProSME proper names.
- CMS-driven public content covers the homepage block layout, pages, navigation, footer, contact details, news, resources, events, FAQs, funding calls, eligibility questions, statistics, SEO, indexing, analytics configuration, and site globals.
- Payload media fields render approved responsive images on the homepage, page headers, cards, and detail views. Alt text is required.
- Payload drafts, versions, authenticated draft previews, enforced review approval, publish permission, unpublishing, restoration history, immutable content audit entries, and post-publication route revalidation are configured.
- The resource-specific CMS capability matrix is enforced for Pages, News, Resources, Events, FAQs, Funding Calls, Eligibility, Statistics, Media, Site Settings, and engagement submissions. Frontend draft rendering rechecks the same PostgreSQL permissions.
- CMS principals are passwordless, read-only mirrors in Payload and are visible only to system administrators. The first-administrator bootstrap is idempotent and records role/status changes in the immutable application audit table.
- Reusable Hero, Rich Text, Call to Action, Statistics, Resource Grid, and FAQ List blocks are available to editors.
- The published baseline uses the approved four statistics and states that all sectors may apply while presenting priority focus sectors.
- Fictional funding opportunities, testimonials, outcomes, and success stories were removed.
- The approved Option B hero treatment uses client-approved photography uploaded through Payload with required alt text.
- The approved two-page first-call criteria PDF is served from `/documents/sme-fund-first-call-funding-criteria.pdf`.
- Contact and newsletter forms require consent, validate input, show success/error states, and persist submissions in Payload.
- CMS-controlled metadata, Open Graph images, per-page indexing, organisation structured data, sitemap, global robots controls, local font loading, responsive images, reduced-motion behavior, and opt-in analytics are implemented.

## Automated evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Architecture boundaries | Pass | Application and form-architecture checks passed across 222 source files |
| Handwritten file limits | Pass | 236 files checked; no limit exceeded |
| ESLint | Pass | Zero errors and zero warnings |
| TypeScript | Pass | `tsc --noEmit` exited successfully |
| Unit/access tests | Pass | 18 files and 61 tests passed, including resource isolation, role separation, review/publish workflow, disabled-user denial, migration coverage, frontend preview scoping, form reuse, and client data-access boundaries |
| Live negative authorization | Pass | An applicant was denied CMS access; an editor reached CMS without principal administration; capability removal and user disabling denied the existing session immediately; bootstrap audit records were proven immutable |
| Application authorization migrations | Pass | Six repeatable migrations are present and applied; the live catalogue contains 9 roles, 61 capabilities, and 197 role-capability grants, and the immutable audit trigger was verified |
| Payload migrations | Pass | All 11 committed Payload migrations applied successfully; the migration table is current through `20260912_181500_code_owned_primary_navigation` |
| Approved content seed | Pass | Idempotent production-mode seed completed after the final migration |
| Production build | Pass | Next.js 16.3.4 compiled and generated all application routes |
| Automated accessibility | Pass | axe found no serious or critical violations on all 12 required public routes |
| Responsive automation | Pass | Desktop, Pixel 5, and iPad-width Chromium checks found no horizontal overflow and verified page landmarks |
| Public payload budget | Pass | Homepage browser resource transfers remained below the 2.5 MB Phase 2 budget |
| Required public routes | Pass | Home, About, Funding, Eligibility, How to Apply, News, Resources, Events, FAQ, Contact, Privacy, and Terms returned HTTP 200 |
| Funding-call detail | Pass | Seeded closed first call returned HTTP 200 |
| Criteria document | Pass | Local two-page PDF returned HTTP 200 |
| Contact persistence | Pass | Local production API returned HTTP 201; temporary record removed after verification |
| Newsletter persistence | Pass | Local production API returned HTTP 201; temporary record removed after verification |

## Acceptance record

- G1 technical-lead acceptance was confirmed.
- The client content owner and client project authority accepted G2.
- Manual responsive, keyboard, and screen-reader review was accepted.
- Content, photography, contact details, privacy and terms content, and the final Option B implementation were accepted.
- The real-Firebase administrator bootstrap and required negative authorization scenarios passed against the production container and live PostgreSQL authorization state.

## Decision

G2 is **passed**. Phase 2 is closed and Phase 3 may build on the accepted authorization and public-content foundation.
