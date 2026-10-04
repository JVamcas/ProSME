# Funding call attached version links

Date: 2026-10-04

The funding-call read-only details show the application form, eligibility
ruleset and workflow version IDs as underlined links. Each destination uses
the attached version's owning definition ID and explicit `versionId` query
parameter. Empty attachments remain plain **Not provided** text.

The protected funding-call detail read resolves all three owning definitions
with one SQL query and retains the exact attached version IDs. Destination
pages enforce their existing form, eligibility or workflow read permissions.

Eligibility and workflow editors already supported version selection. Form
editor reads now accept and validate an optional version ID, verify it belongs
to the requested definition, and use a separate TanStack Query cache entry.
A missing or mismatched version returns Not Found. Requests without a version
retain normal draft/latest selection. The editor retains its full version
history, including the existing definition-edit restrictions. Published and
retired versions retain their existing immutable behavior.

The touched form workspace and controller moved from the legacy component
folder into `modules/forms/ui`, following the structure contract.

Verification: architecture, form architecture, file-size, lint and type checks
passed. Lint has zero errors and 16 existing unrelated warnings. All 298 tests
across the 71 form/funding-call test files passed, including version-link
rendering, permission denial, query validation, SQL projection/scope and cache
separation. `git diff --check` passed.
The production build passed, including compilation, TypeScript, page generation
and build traces.

The full suite was not repeated; the previously reported unchanged
application-list failure remains separate. Browser acceptance and deployment
were not performed. No database migration is required for this link change;
the earlier lifecycle migration 0161 remains a separate release requirement.
