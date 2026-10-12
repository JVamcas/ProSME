# Events & Programmes Phase 3 Gate

Date: 12 October 2026

Status: implemented locally; database migration and browser acceptance remain
pending.

## Implemented scope

- `/events` follows UI-01 with the cream introduction, Upcoming events navigation,
  event search, event-type filter and full event cards.
- Each server-rendered page requests three records. Payload performs publication
  filtering, period filtering, search, type filtering, ordering, count and page
  selection before returning the projection.
- Every event card preserves `/events/[slug]` navigation and provides a Register
  action. Registration opens the existing shared `RightDrawer` with the selected
  event clearly identified.
- The detail route reads an event directly by slug, so events beyond the current
  listing page remain addressable. Its registration action uses the same drawer.
- Event date and time output uses each event's saved IANA timezone for the start,
  end and timezone abbreviation.
- The form reuses React Hook Form, Zod, shared form fields, checkbox, button,
  progress icon and confirmation treatment. It announces validation and server
  errors and disables submission while React Hook Form or the mutation is pending.
- The public API validates transport input and calls the existing transactional
  registration service. PostgreSQL's unique event/email constraint makes retries
  idempotent. The service rejects invalid IDs, unpublished events, closed windows
  and unchecked event-email consent.

## Local evidence

- Focused event tests: 42 passed, including route validation, server registration
  policy, duplicate replay behaviour and shared right-drawer selection.
- Focused lint and full type checking passed.
- Architecture, form architecture, component reuse and file-size gates passed.
- `git diff --check` passed.

No production build or deployment was run. Applying migration `0194` and testing
against a configured registration window are still required for live database
acceptance. Browser visual acceptance remains separate.

## Listing follow-up — 12 October 2026

Upcoming results now include ongoing published events until their saved end time,
as well as events that have not started. Pagination reuses the shared control and
always displays the total and page count, including for a single page of results.
The database still performs filtering and pagination with three records per page.

Six focused repository/pagination tests, focused lint and full type checking passed. Architecture,
form architecture and component reuse checks passed. The broader event suite had
one failure in concurrently changed email reconciliation: its settings-update
test does not mock the new repository call. The file-size gate reported an
unrelated notifications file at 402/400 lines. A read-only connection attempt to
the configured database timed out, so saved event publication states were not
verified here.
