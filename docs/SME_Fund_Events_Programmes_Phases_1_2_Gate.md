# Events & Programmes — phases 1 and 2 implementation evidence

Date: 11 October 2026.
Status: implementation delivered; database and CMS browser acceptance pending.
Scope: phases 1 and 2 of the Events & Programmes implementation plan only.

## Implemented foundation

- Application-owned settings, participants and audit persistence use the stable
  CMS event ID. Registration defaults closed until Operations configures it.
- Canonical permissions separate participant reads, settings reads, settings
  changes and email delivery reads. Protected services check the relevant grant
  before querying and constrain reads to the requested published event.
- Registration validates the pictured participant fields. The user confirmed
  that the event-email checkbox must be checked; consent is enforced by the
  schema and database. It does not create a marketing subscription.
- Publication, opening, closing and event-start checks run on the server.
  Opening is inclusive; closing and event start are exclusive.
- Normalized event/email uniqueness prevents duplicate registrations. Replays
  return a generic acknowledgement without exposing existing participant data.
- Registration, audit and durable notification intent share one transaction.
  Confirmation/reminder intents stay inert until phase 4 reconciles publication
  changes and hands them to the existing notification engine.
- Participant search, counts, sorting and pagination execute in SQL. Event
  content search/type/category/date filters and pagination execute through
  Payload's persistence query. Detail lookup queries the slug directly.
- Application migration `0194_event_registration_foundation` and Payload migration
  `20261011_120000_event_metadata` are repeatable. Cross-owner foreign keys can
  be installed in either migration order; the standard runner applies Drizzle
  before Payload. Neither migration was applied to a live database here.

## CMS editor

- The custom CMS sidebar includes Events at `/cms/collections/events`, using the
  existing shared navigation list. This entry was added after the initial delivery.

- Content, Publication, Registration and Recording sections compose the existing
  CMS editor section component. Text, textarea and select controls use the
  existing app field adapters; dates use the app date picker and time inputs.
- Image selection uses app buttons and the existing CMS image renderer, with
  native Payload media drawers retaining upload validation and authorization.
- The description retains the existing Lexical editor and fixed toolbar. Payload
  owns its form mechanisms, preview, versions, audit and publication guards.
- Save draft reuses the existing app button/native Payload action. Publish moves
  an authorized publisher directly from draft to published and records approval.
- Timezone, event type, category and recording URL metadata are added to both
  the main CMS document and version schema. Existing external registration URLs
  are preserved. Invalid timezones, unsafe recording links and reversed event
  dates are rejected.
- Open registrations links to `/admin/events/<saved CMS ID>`. The Operations
  screen at that destination belongs to phase 4 and is not implemented here.

## Local evidence

- Architecture, form architecture and component reuse gates: passed.
- File-size gate: passed; source uses readable multiline formatting.
- Lint: passed with 26 existing warnings outside this change.
- Focused event/content tests: 70 passed. Includes draft/review actions,
  publication guards, validation, date boundaries, authorization, replay
  behaviour, persistence query projections and direct slug lookup.
- Eight isolated PostgreSQL tests are supplied but skipped because
  `EVENT_REGISTRATION_TEST_DATABASE_URL` is unavailable. The configured database
  hostname could not resolve (`EAI_AGAIN`); no local server is available.
- Type checking was run. The default 2 GB Node heap exhausted memory. A bounded
  4 GB run completed analysis and found one image-drawer callback type error:
  Payload types its saved document as `TypeWithID`. The callback now checks that
  `mimeType` exists and is a string before using it. A final full type-check rerun
  was subsequently requested by the user and passed with
  `NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck` (exit code 0).
- Payload types and import map regenerated successfully.
- Stale generated Next route types referenced the removed news `[slug]` route.
  Generated type caches were backed up under `/tmp/sme-events-phase12-route-types`
  and refreshed with `next typegen`, without a production build.

## Acceptance still required

Run the eight PostgreSQL tests using an isolated test database, apply migrations
through the normal release process, and verify in an existing browser that staff
can save, preview and publish events and that draft changes leave
published public content and active registration/email settings unchanged.
No browser visual acceptance, deployment or real email receipt is claimed.
No phase 3 public registration UI, phase 4 Operations UI/email dispatch or phase 5
recording archive UI was added. Written product acceptance remains pending.


## CMS visual correction and publication update — 11 October 2026

The editor now uses a single two-column composition: Edit event/status and
Preview/Publish at the top; the main white form on the left; Publication,
Registration and Recording cards on the right; Editorial metadata and Save draft
at the bottom. The cream background, card proportions, date/time row,
timezone/venue row, compact controls, and image/action row follow UI-02.
Existing app inputs, selects, date picker, buttons, badge and CMS image rendering
are reused. Native unnamed Payload groups preserve stored paths and versions.
The field adapter retains custom category/timezone controls.

The user explicitly replaced Submit for review with Publish. Authorized publishers
now publish directly from draft; the existing guard records approval on publish
and continues to reject users without `cms.events.publish`. Review metadata stays
stored and hidden. No separate review action is shown.

Focused event tests: 39 passed, including rendered header/footer/panel structure,
custom-field adapter preservation and direct publication authorization.
Browser visual acceptance remains pending: installed Chromium cannot start because
`libnspr4.so`, `libnss3.so`, `libnssutil3.so` and `libasound.so.2` are absent.
No browser/system dependencies were installed and no production build was run.

Final correction checks: full type checking passed with the bounded 4 GB heap;
focused lint passed; architecture, form architecture, component reuse and
file-size gates passed. The focused event suite was rerun: 39 tests passed.
`git diff --check` passed. These are local checks, not browser visual acceptance.

Schedule and media follow-up: Start and End now reuse the existing Ant-backed
`FormDateTimeInput`, preserving event timezone conversion and allowing an end
on a different date. The event image field now directly renders the existing native Payload
`UploadField`, as used by News and homepage images. This retains its existing
media document drawer, upload, selection and preview behaviour. The attempted
shared media CSS changes were reverted. Focused lint, full type checking, 39 event tests and
architecture/file-size gates passed. Browser visual acceptance remains pending.
