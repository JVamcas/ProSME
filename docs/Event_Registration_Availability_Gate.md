# Public registration availability

Date: 2026-10-12

## Change and focused acceptance

The public event listing and detail page disable Register when registration is
unavailable and display the small note “Registration is not available yet.”
The disabled button references that note through `aria-describedby` and cannot
open the registration drawer.

The content service evaluates the same domain policy as registration submission,
using the event's publication and start time plus registration enablement,
opening, and closing times. Missing settings and missing records default to
unavailable. A bounded listing page reads only the necessary availability columns
in one SQL query for its selected event IDs. Recording listings do not make this
additional read. The submission endpoint still checks current availability.

## Evidence

- 25 focused tests passed for the drawer, availability, registration policy,
  and existing event content repository.
- Type checking and focused ESLint passed.
- Architecture, form architecture, component reuse, and file-size checks passed.
- PostgreSQL tests were added for the availability projection, bounded ID
  filtering, missing settings, draft state, and empty pages. Their execution
  was blocked: Docker could not expose the initial test port, then the daemon
  became unavailable; the database connection was refused. No PostgreSQL
  integration acceptance is claimed.

The source and focused UI/service checks are accepted. Browser and container
acceptance remain pending. No production build or app restart was performed;
the app image must be rebuilt to display the source change. Removal of the
disposable `event-availability-test` container also could not complete while
Docker was unavailable.
