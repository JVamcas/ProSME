# Operations event cards

Implemented the approved vertical event list at `/admin/events` using the
application `PageShell`. Each card shows its cover image, title, a summary
clamped to two lines, event-local date/time, location and Manage event link.
Images sit beside the details on larger screens and above them on mobile.
Missing covers show a calendar placeholder. The card uses Next.js Image and
does not import any CMS UI components.

The authorized service delegates the list to the existing Payload event
repository. Its bounded projection selects only card fields and populates
media metadata; Payload performs ordering, pagination and counting. Existing
Operations permissions and descending event-date ordering remain in effect.

## Local verification

- Architecture, form architecture and component reuse checks passed.
- File-size check passed.
- Type checking passed.
- Repository lint passed with 26 existing warnings and no errors.
- Event unit suite: 14 files, 75 tests passed.
- Final repository and authorization checks: 2 files, 18 tests passed.

Local source and focused test acceptance is recorded here. Browser visual
acceptance and live database acceptance remain unverified. No production
build or deployment was performed.
