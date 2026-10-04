# Public Website CMS — Phase 1 gate record

Date: 2026-09-29

## Implemented foundation

- Operations and Payload read the same brand colour tokens from `apps/platform/src/shared/ui/brand-tokens.css`. The existing `Logo` was moved to `src/shared/ui/Logo.tsx` and reused by both portal and CMS.
- Payload keeps its native `RootLayout`, permission-filtered collection navigation, responsive menu, lists, forms, media picker, and data loading. Its frame uses the operations navy sidebar, white top bar, orange accents, card treatment, and focus styling.
- CMS navigation adds the logo, signed-in user summary, public-site link, and an operations link only when the user has operations access. The CMS logout control reuses the existing `GeneralButton` and calls the existing Firebase-aware client auth service.
- No public content model, publishing rule, migration, or operations permission was changed.

## Home visible-content inventory

Stable keys below name **visual sections**, independent of the position of a Payload block. The runtime composition is `apps/platform/src/app/(public)/page.tsx`; most content is read through `ServerContentQueries.ts`. A source being present in Payload does not mean the visible text currently uses it.

| Key / visible order | Visible text and images | Current source and editor destination | Gap or ownership |
| --- | --- | --- | --- |
| `home.hero` | Eyebrow, large title, summary, main image, campaign message and quote | `homepage` global: `eyebrow`, `title`, `summary`, `heroImage`, `heroPanelHeading`, `heroPanelSummary`; `/cms/globals/homepage`. Image comes from Media. | “Apply Now”, “Funding Opportunities”, the three benefit captions and their routes are hard-coded in `home-hero.tsx`. Existing `homepage.applyLabel`, `applyHref`, `eligibilityLabel`, and `trackingLabel` do not control these visible desktop/mobile controls. The quote attribution is hard-coded. When `heroImage` is unset, a code-owned orange fallback panel appears on desktop and no mobile image appears. |
| `home.actions` | Three cards: funding, eligibility, application tracking | `home-actions.tsx`, code-owned labels, descriptions, links, icons and colours. | Editorial copy has no CMS destination. |
| `home.funding-call` | Open funding call title, summary, reference, dates, amounts and instrument; or empty state | First open call returned by `ServerPublicFundingCallService.listPublicFundingCalls`; operations owns funding-call records (`/admin/funding-calls`). | Not a Payload entry. Surrounding labels, slogan and empty-state text are code-owned in `HomeFundingCall.tsx`. |
| `home.news-resources` | News/resource heading and cards, when a `resourceGrid` block is present | `homepage.layout` block of type `resourceGrid`: `heading`, `limit`; `/cms/globals/homepage`. Card title, summary, image and date come from published `news` and `resources` entries (`/cms/collections/news`, `/cms/collections/resources`). | `HomeFunding.tsx` automatically takes up to two latest News and fills remaining slots with Resources; there is no manual featured selection. Section subheading and link labels are hard-coded. `homepage.newsHeading` does not control this section. |
| `home.process` | “How it works” heading, introduction and four numbered steps | `HomeProcess.tsx`, code-owned. | All editorial text has no CMS destination. |
| `home.support` | “Who we support” heading, introduction, eligibility link and scrolling support cards | Card `label`/`description` from published `eligibility-content` entries where `kind=criterion`; `/cms/collections/eligibility-content`. If none exist, `ContentDefaults.ts` supplies fallback cards. | Heading, introduction and link label are code-owned in `home-support.tsx`. Icons are positional presentation. |
| `home.additional-blocks` | Any remaining hero, rich text, CTA, statistics or FAQ sections configured for Home | `homepage.layout` blocks, in their stored order; `/cms/globals/homepage`. FAQ list entries come from `/cms/collections/faqs`. The `callToAction` block pointing to `/how-to-apply` and the removed eligibility banner are intentionally suppressed by rendering code. | The editor currently exposes raw Payload blocks, not a visual section guide. Phase 2 must reconcile configured blocks with the sections actually rendered. |
| `home.impact` | “Real businesses, lasting impact” text, background image, four statistics and campaign slogan, **if a statistics block is configured** | `homepage.layout` statistics block: `heading`, `summary`, `backgroundImage`, `items`; `/cms/globals/homepage`. Empty `items` falls back to published `programme-statistics` (`/cms/collections/programme-statistics`). | `statistics-block.tsx` overrides one legacy heading and supplies fallback summary. The campaign slogan is hard-coded. Unlike the fixed sections above, placement depends on block order. |

On phones the Home composition order is the same. The hero image moves below its copy, the three action cards and process steps stack, support cards remain a horizontal marquee, and the impact overlay slogan is hidden. These are presentation choices, not separate CMS records.

## Shared chrome inventory

| Key | Visible content | Current source and editor destination | Gap or ownership |
| --- | --- | --- | --- |
| `site.header` | Announcement, partner logos, SME Fund logo, sign-in/apply controls, public navigation | `header.announcement`, `signInLabel`, `applyLabel`, `applyHref` at `/cms/globals/header`. | Desktop sign-in/apply labels and links are hard-coded in `SiteHeader.tsx`; the Header fields only control mobile controls. Partner logos, adjacent partnership text, SME Fund logo and primary navigation are code-owned structural assets in `SiteHeader.tsx` and `primary-navigation.ts`. Announcement and partner strip are hidden on phones. |
| `site.footer` | Logo, tagline, summary, Explore/Support links, newsletter heading/summary/form, copyright and email | `footer.tagline`, `summary`, `newsletterHeading`, `newsletterSummary`, `copyright` at `/cms/globals/footer`; email at `/cms/globals/contact-details` field `email`. | Logo and link groups are code-owned structural navigation in `site-footer.tsx`; newsletter form is application behavior. The footer stacks into columns on phones. |

## Verification and acceptance

- Source inventory was compared with the Home screenshots supplied for this work and the desktop/mobile rendering branches in the components above. It identifies every pictured editable image/text group and the gaps that Phase 2 must close.
- Payload import map regenerated with the three CMS adapter components. TypeScript, architecture and form-architecture boundaries, file-size, and whitespace checks passed. Lint passed with 20 warnings in untouched files.
- Focused palette, CMS navigation-access and Firebase logout tests passed: 7 tests. The full suite run completed with 1,482 passed, 80 skipped and 16 failed. One failure was the old palette assertion tied to `globals.css`; that assertion was updated for the shared tokens and passed in the focused rerun. The remaining 15 failures concern existing form autosave, UI, navigation and workflow tests outside the Phase 1 files. The full suite is therefore **not** a passing gate.
- Production build passed, including the `/cms/[[...segments]]` route.
- Signed-in desktop/phone checks for `/admin`, `/cms`, a collection list, record form, global form and media picker, including keyboard/touch navigation and sign-out, still require an authenticated browser session. Phase 1 visual acceptance remains pending until those screens are reviewed; code inspection alone is insufficient to claim it.

The inventory is complete as a source map. The overall Phase 1 exit gate remains open until the signed-in visual and interaction checks are recorded.

## Sidebar-header follow-up (2026-09-29)

The signed-in screenshot showed Payload's open-menu toggle overlapping the CMS logo at the left edge of the sidebar. The existing Payload toggle is now positioned at the right edge of the open desktop sidebar; the native phone close button is also right aligned. The shared logo remains on the left. This is a CSS placement change only: Payload still owns the open/close state and keyboard behaviour. The build, TypeScript, lint, architecture/file-size checks, and seven focused CMS/palette tests passed after this change. Visual confirmation of the updated open and collapsed states remains pending.
