# Events & Programmes Phases 4–5 Gate

Date: 12 October 2026

Status: implementation and focused automated acceptance passed locally.
Desktop/mobile screenshot acceptance, application migration acceptance and real
email receipt are pending. This record does not declare those checks passed.

## Implemented scope

- Operations `/admin/events` provides a bounded event selection list. Each CMS
  event links to `/admin/events/[eventId]` for its registrations and settings.
- UI-03 uses the shared metric summary, Tabs, DataTable, Pagination, form fields,
  buttons, badges and query-error toast hook. The four pictured summary cards,
  three tabs, registration window, event emails and responsibilities panels are
  connected to persisted records. Public and CMS destinations use the same ID.
- Server services enforce the canonical participant, settings-read,
  settings-update and delivery-read permissions independently. Restricted counts
  are withheld; granting delivery access does not grant the participant API or
  settings changes. Inactive staff are denied. Participant reads create audit
  records. Routes validate transport input and return uncached responses.
- Confirmation and reminder intents enter the existing notification outbox,
  template rendering, SMTP adapter, retry policy and delivery history. Event
  participants need no platform account. Published template overrides remain
  supported; source templates reuse the existing email branding and resilient CTA.
- Settings start with a 24-hour reminder. Reminder due time is the published event
  instant minus the configured hours. Confirmation is queued after registration.
  Settings forms use React Hook Form and Zod; opening and closing inputs explicitly
  identify the device timezone and persist ISO instants.
- Registration uniqueness, intent uniqueness, serialized reconciliation and
  occurrence revisions prevent duplicate intent and queued delivery on retries.
  Date/content publication changes reconcile unsent reminders in the CMS update
  transaction. Withdrawal cancels unsent intent and invalidates the old queue.
  Outbox contexts remain immutable; replacements use a new occurrence revision.
- Before SMTP, the dispatcher rechecks publication, consent, settings and the
  published snapshot. Shared event/settings locks remain held through sending,
  so publication and settings changes wait for an in-flight send to finish.
- Migration `0195_event_email_delivery` adds revision state, participant delivery
  support, event notification catalogue/targets and publication reconciliation.
  The Payload metadata migration installs the publication trigger on fresh
  installations when Drizzle runs before the CMS metadata exists.
- UI-01 now includes published recording search, category filtering, cards,
  external playback links and pagination. Recording queries exclude drafts,
  future/ongoing sessions and missing playback URLs. Category choices are a
  distinct, sorted, bounded SQL projection of available published recordings.
- Registration remains in the existing right drawer, as explicitly confirmed by
  the user on 12 October. The adjacent form in the reference is not restored.

## Comparison with exact references

The three original PNGs were opened and inspected directly. This is a source
composition comparison; it is not a browser screenshot comparison.

| Reference | Implementation comparison |
| --- | --- |
| [UI-01 public](design/events-programmes/public-events-concept.png) | Cream introduction, event controls/cards and recording section preserved. Registration uses the approved drawer. Small screens stack controls and cards. |
| [UI-02 CMS](design/events-programmes/cms-event-editor-concept.png) | Existing native editor keeps the main form, publication, registration and recording panels, plus approved Publish action. Its existing CSS stacks panels and image controls on small screens. |
| [UI-03 Operations](design/events-programmes/operations-registrations-concept.png) | Summary cards, shared tabs, participant columns, linked content and side panels implemented. Cards wrap, side panels stack and shared table regions scroll horizontally with keyboard focus. |

Illustrative people, counts, event media and recordings were not added to the
application database. PostgreSQL fixtures use isolated synthetic records only.
Production event/recording media remains a supplied-content dependency.

## Automated evidence

- Event unit/UI tests: **60 passed**. Includes registration drawer selection,
  validation, public recording query filters, event schedule formatting, shared
  tab keyboard navigation, Operations permission visibility, protected route
  enforcement and event-email rendering/retry behaviour.
- Notification regression suite passed in the combined **233-test** event and
  notification run before the final route tests were added. The final event run
  includes those additional protected-route checks.
- Isolated PostgreSQL event/recording tests: **15 passed** with one worker.
  Both migrations were applied twice in the fixture. Checks cover concurrent
  normalized registration retries, concurrent queue preparation, 24-hour timing,
  persisted card/table states, immediate publication reconciliation, stale-send
  rejection, withdrawal/republishing, settings reconciliation, independent staff
  grants, SQL search/pagination and published-only distinct recording categories.
- Full lint and type checking passed. Architecture boundary, form architecture,
  component reuse, file-size and whitespace checks passed.

## Outstanding acceptance evidence

- Existing Chromium launch failed because `libnspr4.so` is unavailable. No browser
  or system dependencies were installed. Desktop/mobile screenshots, rendered
  visual comparison against all three PNGs and browser accessibility checks are
  not accepted yet. Shared tab keyboard navigation has DOM-test evidence.
- Migrations were verified in a disposable PostgreSQL container. They were not
  applied to the application's configured database, and no deployment or
  production build was run.
- SMTP was replaced with a synthetic sender in automated tests. No real email was
  sent; recipient inbox receipt and provider delivery must be verified separately.

Written acceptance: focused automated implementation acceptance is recorded
above. Visual, deployed database and real-email acceptance remain open.
