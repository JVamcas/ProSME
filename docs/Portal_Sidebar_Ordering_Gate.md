# Operations sidebar ordering

Date: 2026-10-12

Application management now appears immediately above My Queue. Events links to
`/admin/events` under Process Monitor, using the existing event read permissions.
Those same three read permissions now qualify users for operations workspace
access. Server-side event permissions remain enforced by the event service.

Focused acceptance: route grouping and ordering, each permitted event-reader
scope, hidden Events without an event read grant, and denial for suspended or
disabled accounts are covered by navigation and access-policy tests.

Architecture, form architecture, component reuse, file-size checks, type checking,
and focused lint passed. The initial test run passed 34 tests and failed two
existing applicant-navigation assertions that expect the old Funding Calls label
and applicant link order. Applicant navigation and those assertions were not
changed. No production build, container restart, or browser verification was
performed. Container-visible changes require a rebuilt app image; Events remains
visible only to users holding an event read permission.

Final focused run: four test files passed, with 34 passing tests and the two
unrelated applicant assertions excluded. No new test failure remains in the
changed operations navigation or access policy.
