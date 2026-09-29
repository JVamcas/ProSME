# Public Website CMS — Implementation Plan

## Purpose

Make `/cms` the straightforward place for authorised staff to find, edit,
preview, and publish content on the public SME Fund website. The primary task
is: **"I am looking at this image or text on Home/About; where do I change
it?"** The editor must lead from public page to visible section to the exact
field that controls it. Make the CMS visually consistent with the operations
portal at `/admin` while retaining Payload's editing, versions, and access
controls.

This plan is subordinate to the
[project structure contract](SME_Fund_Project_Structure_Contract_FINAL.md)
and the repository rules in `AGENTS.md`. It describes implementation work;
it does not record a completed gate.

## Fixed approach

1. Keep one Next.js application in `apps/platform`. Keep `/cms` in the Payload
   route group and `/admin` in the operations route group.
2. Keep Payload as the source of truth for public editorial content. Funding
   calls, eligibility rules, forms, workflows, and applications remain in
   their application modules and operations screens.
3. Keep Firebase authentication and PostgreSQL permissions. The CMS dashboard,
   navigation, edit links, preview, and publishing actions must use the
   existing canonical CMS permissions; visibility alone is never authority.
4. Reuse the operations portal's brand tokens and reusable visual components.
   Integrate them through Payload's supported admin component extension points
   and scoped CSS. Do not wrap Payload in the platform Query provider, replace
   its editor with a second CRUD application, or rely on DOM manipulation.
5. Public navigation links remain code-owned in this phase. The CMS edits the
   content at supported public destinations, not the website's route map.

## The editor's path to a change

```text
Manage website → Home → Hero section → Change image
                              ↳ Change headline
Manage website → About → Page banner → Change banner image
                              ↳ Change title or summary
                         → Main content → Change paragraphs
```

Selecting a page opens a **page guide**, ordered like the visible public page.
Each section is a visual card showing its current heading and, where
relevant, an image thumbnail and short description. **Edit this section**
opens the exact Payload form and focuses the relevant field/group.
**Preview page** opens the public page with draft content; **View live page**
shows published content. Editors select cards, not elements inside a
clickable website preview. A page guide must never send users to a
generic collection list when a specific field or record is known. Shared
header/footer controls are shown as **Appears on every page** rather than
repeated as if they belonged to Home or About.

The first page guides must make these relationships explicit:

| Public page and visible section | What an editor asks | Editor target | Current state |
| --- | --- | --- | --- |
| Home → Hero | Change large image, headline, introduction, or image-overlaid text | `homepage` global: `heroImage`, `title`, `summary`, `eyebrow`, `heroPanelHeading`, `heroPanelSummary` | CMS-owned |
| Home → Hero buttons and benefit captions | Change "Apply Now", "Funding Opportunities", or three short benefit captions | Homepage content fields for editorial labels; functional destinations remain code/route-owned | Some CMS fields exist but the rendered text is hard-coded; connect or add fields |
| Home → Three action cards | Change each card title or description | New, structured Homepage editorial fields; preserve fixed action destinations | Hard-coded in `HomeActions` |
| Home → Featured funding call | Change call name, summary, amount, or dates | Operations funding-call editor, linked only for authorised users | Application-owned data; never duplicate in Payload |
| Home → News and resources | Change section heading or individual items | Homepage resource block; News/Resources collections | CMS-owned; Home shows the latest two published news items and two published resources automatically |
| Home → How it works | Change heading, introduction, step title, or step text | New, structured Homepage editorial fields | Hard-coded in `HomeProcess` |
| Home → Who we support | Change section heading or introduction; change a card | New Homepage section-copy fields; `eligibility-content` entries for cards | Heading/intro hard-coded; cards CMS-owned |
| Home → Other editorial blocks | Change section text or images | The matching block in `homepage.layout` | CMS-owned; guide must show the actual visible block name and order |
| About → Page banner | Change title, summary, or banner image | `pages` record `about`: `title`, `summary`, `featuredImage` | CMS-owned; the eyebrow is hard-coded |
| About → Main text and sections | Change paragraphs or section images/text | `pages` record `about`: `content`, matching `layout` block | CMS-owned |
| Every page → Header and footer | Change announcement, footer copy, contact information | `header`, `footer`, `contact-details` globals | Some header fields do not drive desktop output; audit and fix |

Apply the same section-by-section inventory to all public destinations before
calling them complete. Make public editorial copy and images editable where
their ownership is Payload. Keep structural navigation, legal workflow
controls, and application data with their existing owners, but show an
accurate **Managed in operations** or **Fixed website control** explanation
instead of an empty or misleading edit button. This is a content-ownership
decision, not an excuse to leave editorial text hard-coded.

## The editor's navigation

`/cms` opens a **Manage website** dashboard. Its first view is a set of
public-page cards, grouped as below. Each card shows a plain-language name,
the actual public path, and **Find a section** / **View website** actions.
Where a destination has both introductory copy and repeatable entries, its
page guide shows those as separate sections. Only actions backed by the
user's permissions appear. Missing required singleton records get a
controlled empty state and an authorised create/recovery action, not a broken
link.

| Dashboard group | Entry | Public destination | Existing Payload owner | Page guide sections |
| --- | --- | --- | --- | --- |
| Website pages | Homepage | `/` | `homepage` global, related content collections | Hero; action cards; featured funding call; news/resources; process; support; remaining blocks |
| Website pages | About | `/about` | `pages` record with slug `about` | Banner; main text; additional sections |
| Website pages | How to apply | `/how-to-apply` | `pages` record with slug `how-to-apply` | Banner; guidance; additional sections |
| Website pages | Contact | `/contact` | `pages` record with slug `contact`; `contact-details` global | Banner/copy; contact information; contact form context |
| News and events | News | `/news` and `/news/[slug]` | `pages` slug `news`; `news` collection | Page introduction; article list; article detail |
| News and events | Events | `/events` and `/events/[slug]` | `pages` slug `events`; `events` collection | Page introduction; event list; event detail |
| Resources and FAQs | Resources | `/resources` and `/resources/[slug]` | `pages` slug `resources`; `resources` collection | Page introduction; resource list; resource detail/link |
| Resources and FAQs | FAQs | `/faq` | `pages` slug `faq`; `faqs` collection | Page introduction; questions and answers |
| Funding information | Funding explanation | `/how-to-apply/funding` | `pages` slugs `funding` and `eligibility`; `eligibility-content` collection | Funding explanation; eligibility explanation; focus-sector text; operations-owned call data |
| Site details | Header, footer, and site details | Repeated across public pages | `header`, `footer`, `site-settings` globals | Shared header; footer; site metadata |
| Media | Images and files | Referenced by public content | `media` collection | Media library with usage context |

The dashboard must resolve fixed `pages` slugs to document IDs on the server
before creating edit links. It must not assume an ID or use the public URL as
a Payload edit URL. The mapping is explicit and testable. Collection lists
continue to use Payload's native list and edit views, with the public
destination visible in each relevant row and edit screen.

Do not show `/funding` or `/eligibility` as editable website destinations:
both routes redirect. The two editorial records currently contribute to
`/how-to-apply/funding`. The funding calls themselves are managed in
`/admin/funding-calls` and must be clearly signposted there.

`Contact submissions` and `Newsletter subscriptions` are engagement records,
not public page content. Keep them in a separate **Enquiries** area for users
with the relevant permissions. CMS principals and audit entries stay in an
administrator-only **Administration** area.

Privacy and Terms already have Payload `pages` records. Preserve their
existing editors and public routes, but leave their section-guide redesign
outside this nine-phase page sequence; do not delay the requested pages to
redesign legal content.

Home does not have a manual featured-item picker. Its News and Resources
section shows the latest two published news articles and latest two published
resources, ordered by `publishedAt` where set and `createdAt` otherwise,
with newest first and ID as a stable tie-breaker. Editors update the individual
item in its own page guide; Home then updates automatically. If fewer than
two of either type exist, show the available items without filling the gap
with unpublished content. This rule must be visible in the Home guide.

## Visual structure and implementation

The `/cms` screen should use the same overall pattern as operations:

```text
┌───────────────────────┬──────────────────────────────────────────┐
│ SME Fund logo         │ Top bar: page context, account/actions    │
│ User summary          ├──────────────────────────────────────────┤
│ Website navigation    │ Page heading and short guidance           │
│ News and events       │ Destination cards or Payload edit/list     │
│ Resources and FAQs    │ forms, tables, media picker, preview      │
│ Funding information   │                                          │
│ Site details          │                                          │
│ Back to operations*   │                                          │
│ Help / sign out       │                                          │
└───────────────────────┴──────────────────────────────────────────┘

*Show the operations link only when the user can enter `/admin`.
```

Implementation placement across the phases:

1. Extract the applicable logo, sidebar item, user summary, top-bar, and
   mobile-navigation presentation from the existing operations shell into
   domain-neutral `src/shared/ui` components or shared styles. Keep portal
   navigation policy in its existing owner. Avoid copying the whole shell.
2. Add content-owned CMS admin components under `src/modules/content/ui`:
   a branded Payload navigation, dashboard, page/section guides, public URL
   links, and editor guidance. Register these from `src/payload.config.ts`
   using Payload admin component hooks. Keep the Payload `RootLayout` in
   `src/app/(payload)`.
3. Expand `src/app/(payload)/custom.scss` using shared SME Fund colour and
   spacing values to style Payload's sidebar, header, form controls, buttons,
   lists, status indicators, dialogs, and responsive states. Scope rules to
   the CMS and check contrast, keyboard focus, reduced motion, and mobile
   layouts. Avoid broad selectors that alter the public site.
4. Use a CMS-specific sign-out integration compatible with Firebase sessions
   and Payload's layout. The existing portal `LogoutButton` uses TanStack
   Query and cannot simply be mounted inside Payload. Maintain correct
   account identity and sign-out behaviour without adding the platform Query
   provider to `/cms`.
5. Make `/cms` and its nested paths retain an active **Content management**
   context. CMS-only users must see a valid CMS home and no inaccessible
   `/admin` link.

Payload's built-in list, edit, upload, version, and permission handling remain
in use. The custom dashboard and navigation are entry points into those views.

## Structure of editing screens

Use the same pattern for all content screens:

1. A heading in the language of the public website, such as **About page** or
   **News article**.
2. The public destination, with **View live page** and **Preview draft**
   actions when the destination can display the draft.
3. The chosen visible section's fields: its text, image, or approved blocks.
   Use the same section name as the page guide and public website.
4. A quieter **Publishing** area: current draft/review/live state, review
   notes, available next action, and previous versions.
5. An **Advanced** area for slug, SEO fields, and technical settings. Show the
   resulting public URL before a slug change and explain its effect on links.

Add explicit labels, descriptions, examples, field grouping, and useful list
columns to the existing Payload collection/global configs. Prefer
presentational tabs or collapsible groups that preserve existing field names
and stored data. Do not introduce a second form state system or rename fields
merely for presentation. If a stored schema changes, include a repeatable
migration and regenerate Payload types/import map as required.

For editorial content, show these transitions in ordinary language:

```text
Save draft → Ready for review → Approved → Published
```

The implementation must reconcile `reviewStatus` with Payload's `_status`,
including existing records, and display only actions that the user can take.
Server hooks must continue to enforce approval and publishing permissions.
Replace raw permission-code errors in the editor with actionable explanations;
do not weaken the underlying policy. Retain version history and a clear way
to return to a previous version.

## Public-site and preview corrections

The editor must be truthful about what a change will affect. Phase 1
inventories Home; each later page phase inventories its own visible sections
and closes gaps before its exit gate. Specifically:

- Some fields in the `header` global are not used by the desktop header, and
  primary navigation is code-owned. Label or remove ineffective editor
  controls; connect fields when they should genuinely be editable.
- The homepage applies code-owned ordering/filtering to some blocks. Describe
  those sections in the form or align the public rendering with the editor's
  visible order.
- The `funding` and `eligibility` page records are read by
  `/how-to-apply/funding`; preview and link labels must reflect that actual
  destination. The two records and programme text may require different
  read permissions, so preview must check every relevant source.
- News and event detail pages currently resolve items through a limited
  listing. Give detail pages a slug-specific query so older published items
  and draft previews still resolve.
- Resource detail URLs may redirect straight to a file or external URL.
  Provide a useful preview of the resource's metadata/card and a separate
  file/open-link action.
- Clearly mark draft preview on the public site and provide **Exit preview**.
  Check that leaving preview restores published content. Public visitors
  must never receive draft content.
- Check public revalidation after publish, unpublish, deletion, and slug
  changes for both listing and detail destinations. Do not imply a save is
  live until the public route reflects it.

## Dependency chain and phase gates

```text
1. Shared appearance and CMS entry
       ↓
2. Home
       ↓
3. About
       ↓
4. How to Apply
       ↓
5. News
       ↓
6. Resources
       ↓
7. Events & Programmes
       ↓
8. FAQs
       ↓
9. Contact
```

Each numbered task below is a focused, independently reviewable change. A
phase may contain more than one pull request. Finish the whole public page,
including its CMS sections, public rendering, preview, permissions, and
tests, before starting the next page. Preserve a usable CMS at every step.
Migrate touched legacy UI toward `src/shared/ui` or the content module; do
not reorganise unrelated code or add another application.

Every phase exit gate needs a short written record of completed and deferred
scope, automated and manual test evidence, architecture and file-size checks,
lint and type-check results, build result, known limitations, and explicit
acceptance. Run the repository tests and production build before claiming a
phase complete. A failing unrelated check must be recorded, not labelled as
passed. No phase is accepted solely because its code has been merged.

---

# Phase 1 — Shared Appearance and CMS Entry

## 1.1 Shared visual foundation

### Goal

Give Payload and operations the same visual vocabulary without duplicating
the entire portal shell.

### Scope

Identify the operations sidebar, logo, top bar, user summary, responsive
navigation, colours, type, spacing, and focus treatment. Extract only the
presentation that can be reused into `src/shared/ui` or shared style tokens.
Keep operations routing and permissions in their current owners. Make no CMS
content-model or publication changes.

### Acceptance Criteria

1. The operations portal still looks and behaves as before on desktop/mobile.
2. Shared components do not import Payload or feature-specific server modules.
3. No duplicate second design system is introduced.

### Tests

- Existing portal navigation and shell tests; visual comparison of `/admin`
  at desktop and phone widths.

### Done When

The operations design elements are reusable by the Payload adapter.

## 1.2 Branded Payload frame

### Goal

Make `/cms` visibly belong to the operations portal on every CMS route.

### Scope

Use Payload admin component hooks in `src/payload.config.ts` for logo,
navigation, header, and account/logout controls as appropriate. Add scoped
styles in `src/app/(payload)/custom.scss` for the shared palette, typography,
spacing, responsive sidebar, and focus states. Keep Payload's `RootLayout`,
list/edit views, and internal data loading. Do not add the portal Query
provider to `/cms`.

### Acceptance Criteria

1. `/cms`, a collection list, a record form, a global form, and the media
   picker all use the agreed operations visual treatment.
2. Navigation works with keyboard and touch at desktop and phone widths.
3. Sign-out clears the existing session and returns to sign-in.
4. CMS-only users never receive a link to an inaccessible `/admin` page.
5. Payload editor actions and access rules still work.

### Tests

- Navigation, account, and access tests; visual and keyboard checks for the
  five screen types above.

### Done When

An editor can enter and leave a consistently branded CMS, even before the
new destination dashboard exists.

## 1.3 Visible-content inventory

### Goal

Establish the section map a staff member would use while looking at the
public website.

### Scope

For Home and shared header/footer, record sections in visible order, the
text and images, their data source, exact Payload field/record if one exists,
and their owner if generated from operations data. Later page phases perform
their own inventory before editing that page.
Mark hard-coded editorial copy as an implementation gap and structural
controls as intentional. Use stable section keys, never array position.

### Acceptance Criteria

1. A reviewer can point to any Home image or paragraph and find
   its source or a named implementation gap.
2. Each section has one clear editor destination or ownership explanation.
3. The inventory reflects desktop and phone layouts.

### Tests

- Compare Home screenshots with the inventory and spot-check the shared
  header/footer. About is inventoried in Phase 3.

### Done When

The section map can drive a truthful page guide.

## Phase 1 Exit Gate

Accept the shared visual foundation, branded CMS frame, and Home
section inventory with signed-in desktop/mobile evidence. Record any Payload
views that still need styling; do not describe the interface as fully
unified if they remain different.

---

# Phase 2 — Home Page

The phase owns `/` and the **Home** entry in CMS. It is complete before
starting About. The editor sees visual section cards in the public display
order, with current copy or an image thumbnail, **Edit this section**,
**Preview page**, and **View live page**. Existing `homepage` global fields
remain the starting point; new fields are added only for visible content
that currently has no effective CMS control.

## 2.1 Home section guide

### Goal

Answer “where do I change this part of Home?” from a single Home screen.

### Scope

Implement section cards for Hero, Three action cards, Featured funding call,
News and resources, How it works, Who we support, and Impact/other visible
editorial blocks. Show a current heading/image preview and the exact editor
target. Keep shared header/footer in a clearly marked **Appears on every
page** area. The funding-call card links to `/admin/funding-calls` only for
authorised users and explains that the data is managed there.

### Acceptance Criteria

1. The cards appear in the same order as the public Home page.
2. A current Home hero image, headline, or paragraph is recognisable in
   the guide without knowing its Payload field name.
3. Each Edit action lands in the correct field group; a missing/unavailable
   control is labelled, never linked to an unrelated generic list.
4. A CMS-only user can use the Home guide without `/admin` access.

### Tests

- Section-to-field mapping, permissions, missing content, and desktop/mobile
  visual navigation.

### Done When

An editor can identify every visible Home section from `/cms`.

## 2.2 Hero and three action cards

### Goal

Make the top of Home editable exactly as it appears in the supplied examples.

### Scope

Group the hero's eyebrow, large headline, summary, main image, image-overlay
message/quote, button labels, and benefit captions together. Connect
existing `homepage` fields that are currently ignored by hard-coded public
copy. Add structured Homepage fields for the three action-card titles and
descriptions. Keep functional button and card destinations code-owned;
describe where each goes. Keep desktop/mobile image use clear: one hero
image currently drives both presentations.

### Acceptance Criteria

1. Each visible text fragment and the main image in the first three supplied
   Home screenshots has a matching, clearly named CMS control.
2. Editing one field changes the matching public element after publication.
3. Existing live copy and imagery survive migration or seeding unchanged.
4. Destination links and permission rules remain correct.

### Tests

- Field-to-public-rendering tests, migration/seed repeatability if schema
  changes, and manual draft/published checks at desktop and phone widths.

### Done When

Staff can replace the Home hero image, its text, and each action-card text
through the Home editor.

## 2.3 Remaining Home sections

### Goal

Finish every visible Home section in the same page editor.

### Scope

Make How it works heading, introduction, and four step titles/descriptions
editable; keep step icons/destinations fixed unless needed for correctness.
Make Who we support heading/introduction editable and link its existing
support-card records from the Home guide. Group Impact text, background
image, and statistics under the visible Impact section; explain whether a
statistic comes from the Homepage block or `programme-statistics`. Keep the
featured funding call sourced from operations. The News and Resources card
explains its automatic latest-two-of-each rule and links to the relevant
News and Resources editors. Do not add manual feature selection.

### Acceptance Criteria

1. The How it works, Who we support, and Impact text/images shown in the
   supplied screenshots have a direct editor control or clearly named
   operations owner.
2. Home displays at most two currently published news items and two
   currently published resources, in the documented date order.
3. Draft or deleted News/Resources entries never appear on Home.
4. Reordering Homepage blocks does not make the section guide point to the
   wrong block; visible page order and guide order agree.

### Tests

- Home section rendering, automatic News/Resources selection, missing-item
  cases, block reorder, and public-versus-draft visibility.

### Done When

Every Home section has a truthful and usable path to its content owner.

## 2.4 Home preview and acceptance

### Goal

Finish Home as an independently usable page before moving to About.

### Scope

Provide draft preview of `/`, a visible draft indicator, and Exit preview.
Show current review/live state in the Home editor. Retain server-side
approval/publish checks, audit, and versions. Verify that publication and
unpublication update the live page, including shared header/footer changes
made through Home. Have a nontechnical author locate and change a hero
image, an action-card paragraph, a process step, and Impact copy.

### Acceptance Criteria

1. Those four edits can be found by their visible section names and
   previewed without publishing.
2. An authorised reviewer can publish; an author without publish access
   cannot bypass approval.
3. Public visitors see only published Home content.
4. The desktop and phone Home page reflect the intended changes after
   publication; Exit preview restores the published view.

### Tests

- Allowed/denied review actions, preview enter/exit, published revalidation,
  version recovery, and guided nontechnical walkthrough.

### Done When

Home can be managed end to end without opening unrelated CMS collections.

## Phase 2 Exit Gate

Accept Home only when an editor can point to every visible text/image in the
provided Home examples and either edit it from the Home section guide or see
the correct operations-owned explanation. Record screenshots, tests, required
repository gates, and written acceptance before starting About.

---

# Phase 3 — About Page

This phase owns `/about` and the **About** CMS page guide. It reuses the
section-card pattern completed for Home; it does not build a second editor.

## 3.1 About section map and form

### Goal

Let staff recognise the About banner, main text, and any additional sections.

### Scope

Inventory the rendered About page at desktop and phone widths. Add cards in
public order for Page banner, Main text, and each visible content block.
Resolve the `pages` record with slug `about` by its actual ID. Group its
`title`, `summary`, `featuredImage`, `content`, and `layout` fields to match
those cards. Make the hard-coded “About us” eyebrow editable if it is
editorial copy. Show image thumbnails and existing headings in the guide.

### Acceptance Criteria

1. A user can start with the visible About banner image or paragraph and
   reach the exact field without using a collection list or slug.
2. No About card points to a field that has no visible effect.
3. Existing About text/image remain unchanged until edited.

### Tests

- Section-to-field mapping, About rendering, missing-record behaviour, and
  migration/seed preservation if a field is added.

### Done When

Every About editorial section is findable and editable from its page guide.

## 3.2 About preview and page gate

### Goal

Complete About before starting How to Apply.

### Scope

Preview the draft at `/about`, show draft state and Exit preview, preserve
approval/publish checks, and revalidate the live page after publication.
Verify shared header/footer controls are clearly labelled as site-wide.
Have a nontechnical editor change the About image, heading, and main text.

### Acceptance Criteria

1. The editor can find, preview, review, and publish those exact changes.
2. Public visitors see only the published About version.
3. Desktop and phone layouts render the changed image/text correctly.

### Tests

- Preview authorization and exit, publishing denial/allowance, revalidation,
  and guided desktop/mobile walkthrough.

### Done When

About is complete without relying on a later phase for its ordinary edits.

## Phase 3 Exit Gate

Accept About with a section-by-section screenshot comparison, tests, required
repository gates, and written acceptance. Then start How to Apply.

---

# Phase 4 — How to Apply Page

This phase owns `/how-to-apply` and its public editorial guidance at
`/how-to-apply/funding` and `/how-to-apply/eligibility`. Funding-call facts,
eligibility rules, and application flow remain operations-owned.

## 4.1 How to Apply section map and content

### Goal

Make visible application guidance easy to find without confusing it with
funding-call configuration.

### Scope

Inventory the guide banner, main instructions, additional blocks, and
linked funding/eligibility guidance. Add visual cards in public order for
each destination. Map the main page to `pages` slug `how-to-apply` and the
funding explanation to `pages` slugs `funding` and `eligibility`, including
their visible blocks. Correctly label redirecting `/funding` and
`/eligibility` paths as redirects, not edit destinations. Make editorial
text/images editable; signpost call-specific values and rule changes to
their operations screens. Keep application instructions and buttons aligned
with the actual applicant flow.

### Acceptance Criteria

1. A user looking at a visible guide paragraph, image, or funding explainer
   can identify the matching CMS section and field.
2. The guide never suggests that editing Payload changes a funding call,
   eligibility rule, or application form.
3. The editor opens the actual public destination, not a redirect URL.

### Tests

- Page/section mapping, public rendering, permission-filtered operations
  links, and redirect-destination checks.

### Done When

The page guide accurately separates editorial guidance from programme data.

## 4.2 How to Apply preview and page gate

### Goal

Complete all How to Apply editorial destinations before starting News.

### Scope

Provide preview/Exit preview for the main and funding guidance pages.
The composite funding page uses multiple content records; enforce preview
read permission for each draft source. Test draft, published, and missing
source behaviour. Validate publication and live revalidation. Have a
nontechnical editor find and change a guidance paragraph and an image.

### Acceptance Criteria

1. The editor previews and publishes the changed copy at the advertised
   path, with no draft leakage to public visitors.
2. A user lacking one source permission cannot preview that source's draft.
3. All How to Apply editorial sections have truthful controls or named
   operations owners.

### Tests

- Composite preview authorization, preview exit, publication/revalidation,
  and guided desktop/mobile walkthrough.

### Done When

How to Apply can be edited end to end from its CMS page guide.

## Phase 4 Exit Gate

Accept the main page and its editorial subpages together with tests,
required repository gates, and written acceptance. Then start News.

---

# Phase 5 — News Page

This phase owns `/news`, `/news/[slug]`, the **News** CMS page guide, and
News entries. Its page guide separates the listing page from the individual
articles shown there and on Home.

## 5.1 News page and article editor

### Goal

Let staff identify whether visible text or an image belongs to the News
page banner or a particular article.

### Scope

Inventory banner, listing cards, and article detail. Add section cards for
Page banner and News articles. Link the banner to `pages` slug `news`, and
each article card to its `news` record. Show the current article image,
title, excerpt, date, and status in the CMS list; group article fields by
visible area. Make list search work by reader-facing title. Keep public
path/slug visible without requiring editors to type it for ordinary edits.

### Acceptance Criteria

1. An editor can locate a visible news card/image and open its exact record.
2. The News banner and article content are clearly different controls.
3. The article list is searchable by title and shows live/draft state.

### Tests

- Slug/record mapping, title search, list projection/status, and public card
  rendering.

### Done When

News content is findable by the way it appears to public readers.

## 5.2 News detail, preview, and page gate

### Goal

Complete News publication before starting Resources.

### Scope

Replace detail lookup through a 20-item listing with a slug-specific read,
so older articles still open. Preview listing-page and article drafts at
their actual URLs; provide Exit preview. Verify article creation, approval,
publication, unpublication, deletion, and slug changes update `/news`,
`/news/[slug]`, and the automatic latest-news selection on Home. Preserve
server permissions and audit records.

### Acceptance Criteria

1. An older published article opens even beyond the first listing page.
2. A newly published article appears on News and, when among the latest
   two, on Home; a draft never does.
3. Old/new public URLs and preview behave correctly after a slug change.
4. An author cannot publish without the required permission.

### Tests

- Detail lookup beyond listing limit, automatic Home selection, preview
  authorization/exit, revalidation, and author/reviewer walkthrough.

### Done When

Staff can manage the News listing and one article end to end from CMS.

## Phase 5 Exit Gate

Accept News with a listing/article screenshot comparison, test evidence,
required repository gates, and written acceptance. Then start Resources.

---

# Phase 6 — Resources Page

This phase owns `/resources`, resource entries, and the **Resources** CMS
page guide. A resource may open a document or an external website instead
of displaying a conventional detail page.

## 6.1 Resources page and item editor

### Goal

Make the visible resource card and its file/link easy to locate and update.

### Scope

Inventory banner, resource cards, thumbnail images, categories,
descriptions, files, and external links. Link the banner to `pages` slug
`resources` and each card to its `resources` record. Group its public
fields by card appearance and destination. Clearly distinguish **Upload
file**, **External link**, and **Thumbnail image**. Explain required image
descriptions and show status/last update in the list.

### Acceptance Criteria

1. An editor can identify a public resource by its card image/title and
   reach the right record.
2. The editor can tell whether the resource opens a file or an external URL.
3. An item cannot silently present two conflicting destinations.

### Tests

- Item mapping, file/link validation, media permissions, and public card
  rendering.

### Done When

Resource content, image, and destination are clear in one editor.

## 6.2 Resource preview and page gate

### Goal

Complete Resources before starting Events & Programmes.

### Scope

Provide a safe preview of resource metadata/card at the public destination,
with a separate **Open file/link** action; do not make Preview immediately
download a file or leave the site. Verify published listing and Home's
automatic latest-resource selection. Revalidate listing/detail paths after
create, publish, unpublish, delete, and slug changes. Preserve access and
audit checks.

### Acceptance Criteria

1. A draft resource card can be previewed without opening its target.
2. Published items appear on Resources and, when among the latest two, on
   Home; drafts never appear publicly.
3. File and external-link actions go to their intended targets.
4. Public and draft views remain distinct after Exit preview.

### Tests

- Preview and target behaviour, upload/link validation, Home selection,
  revalidation, and guided desktop/mobile walkthrough.

### Done When

Staff can manage a resource from first upload to public card and target.

## Phase 6 Exit Gate

Accept Resources with one file-backed and one link-backed item, tests,
required repository gates, and written acceptance. Then start Events &
Programmes.

---

# Phase 7 — Events & Programmes Page

This phase owns `/events`, `/events/[slug]`, event entries, and the
**Events & Programmes** CMS page guide. Programme events in Payload are
editorial listings; programme funding calls stay in operations.

## 7.1 Events page and event editor

### Goal

Help staff find the public event banner, event card, and detail content.

### Scope

Inventory the banner, listing cards, and event detail page. Link the
banner to `pages` slug `events` and each card to its `events` record. Show
event image, title, date/time, location, summary, status, and registration
link in the appropriate sections of the editor. Make the event list
searchable by title and useful date fields; label all times clearly for
the intended local timezone.

### Acceptance Criteria

1. A visible event image/text on `/events` leads to its exact CMS record.
2. Editors can distinguish the Events page banner from individual events.
3. Date, time, location, and registration destination are understandable.

### Tests

- Banner/item mapping, event field validation, list ordering/search, and
  public card/detail rendering.

### Done When

An editor can create and find an event using the public page as a guide.

## 7.2 Event detail, preview, and page gate

### Goal

Complete Events & Programmes before starting FAQs.

### Scope

Replace event detail lookup through the limited events listing with a
slug-specific read. Add preview/Exit preview for both banner and event
drafts. Verify publish, unpublish, delete, slug-change, and date-change
effects on listing and detail pages. Preserve review, access, versions,
and audit behaviour.

### Acceptance Criteria

1. Older events beyond the first list page still open by slug.
2. Only published events appear to public visitors.
3. The draft preview shows the intended event and exits to published view.
4. Listing and detail paths update after publication or slug changes.

### Tests

- Detail lookup beyond list limit, preview authorization/exit,
  publication/revalidation, and guided desktop/mobile walkthrough.

### Done When

Staff can manage the Events page and one event end to end.

## Phase 7 Exit Gate

Accept Events & Programmes with page/card/detail comparisons, tests,
required repository gates, and written acceptance. Then start FAQs.

---

# Phase 8 — FAQs Page

This phase owns `/faq`, FAQ entries, and the **FAQs** CMS page guide.

## 8.1 FAQ page and questions editor

### Goal

Make a visible question and answer easy to find and update.

### Scope

Inventory the FAQ page banner and question groups. Link the banner to
`pages` slug `faq`; link each visible question to its `faqs` record.
Present question, answer, category, display order, and status in plain
language. Make the list searchable by question and explain how order and
category affect the public accordion. Keep any FAQ block appearing on
another public page connected to the same source record.

### Acceptance Criteria

1. A staff member can search for a question as a visitor reads it and open
   the matching answer.
2. Updating order/category changes the documented public position/group.
3. An FAQ reused in a public block is edited once, not copied.

### Tests

- Question search, ordering/category, page/banner mapping, and public
  accordion rendering.

### Done When

FAQ copy and ordering are manageable from the FAQ page guide.

## 8.2 FAQ preview and page gate

### Goal

Complete FAQs before starting Contact.

### Scope

Preview a draft answer in the FAQ page context and provide Exit preview.
Verify approval/publish permissions, new-answer visibility, unpublication,
deletion, and public revalidation. Have a nontechnical editor find one
visible question, change the answer, and check the preview.

### Acceptance Criteria

1. The editor can find, preview, and publish the changed answer.
2. Public visitors see only published questions/answers.
3. The correct question opens in the public preview context.

### Tests

- Preview authorization/exit, ordering and publication/revalidation,
  and guided desktop/mobile walkthrough.

### Done When

Staff can manage the FAQ page and its answers end to end.

## Phase 8 Exit Gate

Accept FAQs with question-to-editor and preview evidence, tests, required
repository gates, and written acceptance. Then start Contact.

---

# Phase 9 — Contact Page

This phase owns `/contact`, its page copy and image, contact details, and
the **Contact** CMS page guide. Contact form submission handling remains
in its existing application flow.

## 9.1 Contact page and details editor

### Goal

Let staff change the exact public contact image, text, email, phone,
address, and office hours.

### Scope

Inventory banner, contact information cards, and form context. Link the
banner to `pages` slug `contact` and information cards to the
`contact-details` global. Show the current image/text and real displayed
values on the guide. Ensure shared contact details are labelled as
**Appears on every page** where also rendered in the footer. Make
editorial headings/intro copy editable; keep form field labels and
submission behaviour governed by the form's functional requirements.

### Acceptance Criteria

1. A user looking at an email, address, phone, office-hours line, banner
   image, or paragraph can reach its exact editor control.
2. A contact-detail change is consistent on Contact and any shared footer.
3. The contact form still submits and displays validation correctly.

### Tests

- Page/global mapping, value formatting, shared footer rendering, form
  smoke test, and migration preservation if fields change.

### Done When

All public Contact information has an obvious, effective CMS control.

## 9.2 Contact preview and final page gate

### Goal

Finish Contact and close the requested page sequence.

### Scope

Preview/Exit preview for contact page copy and details, preserve server
publish checks, and verify public revalidation. Keep contact submissions
in a separate permission-filtered **Enquiries** area rather than treating
them as page sections. Walk an author through changing the displayed
email and banner image, then have a reviewer publish and a visitor verify.

### Acceptance Criteria

1. The editor can preview and publish Contact changes without affecting
   submission records.
2. A public visitor sees the published details and a working contact form.
3. The CMS page guide matches the Contact page on desktop and phone.

### Tests

- Preview authorization/exit, publish/revalidation, enquiry separation,
  and author/reviewer/visitor walkthrough.

### Done When

Contact is complete and the nine-phase requested rollout has been reviewed.

## Phase 9 Exit Gate

Accept Contact with section-by-section evidence, tests, required repository
gates, and written acceptance. Record remaining out-of-scope content such
as legal-page redesign separately; do not describe it as completed here.
