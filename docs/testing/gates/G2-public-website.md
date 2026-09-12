# Gate G2 — Public Website Record

## Gate status

| Field | Value |
| --- | --- |
| Gate | G2 — M4 website accepted |
| State | Implemented; acceptance pending |
| Evidence date | 12 September 2026 |
| Acceptance authority | Client content owner and client project authority |
| Acceptance | Pending |

G2 is not accepted. The Phase 2 engineering implementation and local technical verification are complete, but G1 still requires written technical-lead acceptance. Client content approval, real-user CMS UAT, photography approval, and formal accessibility acceptance remain external gate activities.

## Implemented scope

- The Option B header is orange with a white SME Fund logo and a persistent white secondary navigation row.
- Public calls to action use Apply Now, Check My Eligibility, and Track Application.
- Public copy uses MSME except in the SME Fund and ProSME proper names.
- CMS-driven public content covers the homepage block layout, pages, navigation, footer, contact details, news, resources, events, FAQs, funding calls, eligibility questions, statistics, SEO, indexing, analytics configuration, and site globals.
- Payload media fields render responsive images on the homepage, page headers, cards, and detail views. Alt text is required. Approved photography still needs to be supplied and uploaded by the client.
- Payload drafts, versions, authenticated draft previews, enforced review approval, publish permission, unpublishing, restoration history, immutable content audit entries, and post-publication route revalidation are configured.
- Reusable Hero, Rich Text, Call to Action, Statistics, Resource Grid, and FAQ List blocks are available to editors.
- The published baseline uses the approved four statistics and states that all sectors may apply while presenting priority focus sectors.
- Fictional funding opportunities, testimonials, outcomes, and success stories were removed.
- Unapproved AI imagery is not used; the hero retains its lightweight brand treatment until client-approved photography is uploaded through Payload.
- The approved two-page first-call criteria PDF is served from `/documents/sme-fund-first-call-funding-criteria.pdf`.
- Contact and newsletter forms require consent, validate input, show success/error states, and persist submissions in Payload.
- CMS-controlled metadata, Open Graph images, per-page indexing, organisation structured data, sitemap, global robots controls, local font loading, responsive images, reduced-motion behavior, and opt-in analytics are implemented.

## Automated evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Handwritten file limits | Pass | 167 files checked; no limit exceeded |
| ESLint | Pass | Zero errors and zero warnings |
| TypeScript | Pass | `tsc --noEmit` exited successfully |
| Unit/access tests | Pass | 5 files and 15 tests passed, including review/publish workflow and CMS SEO controls |
| Payload migrations | Pass | Four repeatable Phase 2 migrations applied successfully |
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

## Acceptance still required

- Technical-lead written acceptance of G1.
- Client content owner approval of the seeded wording, generic privacy terms, generic website terms, and coming-soon states.
- Client authority confirmation of the contact address and any telephone number before publication.
- CMS editor/publisher UAT covering create, edit, preview, review, publish, unpublish, and restore with real assigned users.
- Manual stakeholder responsive review at the agreed mobile, tablet, and desktop breakpoints.
- Manual keyboard and screen-reader acceptance; automated axe and contrast checks now pass.
- Client-approved photography and alt text uploaded through the configured Payload media fields.
- Approved analytics property ID and production consent-policy review.

## Decision

Keep G2 **pending acceptance**. The implementation may proceed to stakeholder UAT, but the milestone must not be reported as accepted until G1 is accepted and both G2 acceptance authorities provide written approval.
