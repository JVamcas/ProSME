# Dashboard application drilldowns and reporting periods

Date: 2026-10-12

## Implementation behavior

Each dashboard metric card opens the staff applications list with its filter
already applied: total applications uses all statuses, under review uses
under-review, information requests uses action-required, and pending decision
uses the new pending-decision filter. The cards reuse the existing linked metric
card component.

The server returns the exact submission time window used to calculate the
dashboard. Card links carry those timestamps and visible Namibia calendar dates
to the application list. Applying unrelated filters preserves the exact window;
changing either date replaces that side's timestamp bound. Clearing filters
removes the carried window. Navigating to another filtered URL remounts the list
with its new values and resets pagination.

Reporting-period filtering was already performed in the dashboard repository's
SQL. The query now also uses an explicit upper bound. Filtering precedes SQL
aggregation, status grouping, and bounded recent-activity selection. Application
list timestamp filtering likewise precedes counting and cursor pagination.
Neither flow loads applications for in-memory period filtering.

Dashboard counts and application list filters share the SQL status projection
and configured decision-task predicate. Information requests now counts matching
applications instead of individual request records. Pending decision is based on
active or blocked stages with pending/in-progress tasks whose configured actions
include approval advancement or rejection. Existing all/assigned permission
checks and database assignment scope remain authoritative.

## Verification and acceptance

The focused regression run passes 54 tests across 14 files. It covers linked
cards, initial application filters, validation, HTTP transport, SQL bounds,
aggregates, ordering, assignment scope, and existing dashboard/list behavior.
SQL construction tests are not evidence of executing the queries in PostgreSQL.

Type checking, architecture/form boundaries, component reuse, file-size checks,
and whitespace checks pass. Repository lint passes with 17 existing warnings and
no errors. Source implementation is accepted within this local verification scope.

Browser interaction, live database execution, and deployment acceptance remain
unverified. The PostgreSQL application-submission integration fixture was updated
for the explicit dashboard upper bound but was not executed against a database.
No production build or deployment was performed.

## Reporting-period control follow-up

The reporting-period label and select now reuse the existing `FormSelect`
component, retaining the same options, selected period, and URL navigation.
The three dashboard UI tests, focused lint, type checking, architecture/reuse,
file-size, and whitespace checks pass. This component change is accepted within
that local verification scope.
