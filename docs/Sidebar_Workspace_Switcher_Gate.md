# Sidebar and workspace switcher gate

Date: 2026-10-05

## Implemented behavior

- Applicant, Operations, and Payload CMS use a default expanded sidebar width of 320px, increased from 272px. Existing collapse, resize bounds, keyboard controls, and mobile navigation remain available.
- Expanded Logout controls align to the left, with the same icon inset as the Help link. Collapsed controls remain centered.
- The shared workspace switcher always presents Applicant, Operations, and CMS in that order. Only workspaces permitted by the server projection are links; unavailable workspaces are labelled disabled.
- CMS uses the canonical brand yellow (`--sme-brand-yellow`, `#ffca45`, equivalent to `bg-brand-yellow`) with white text and icons. The switcher highlights only the current workspace using the shared palette tokens.
- CMS workspace availability uses canonical `cms.access` permission checks. Applicant and Operations availability and the default authenticated route retain their existing policies. CMS-only users can use the switcher without creating a portal context.
- Payload retains its own navigation state and data loading. Its shared sidebar does not require a platform Query provider. The Home Page navigation remains unchanged.

## Validation evidence

- Architecture and form architecture: passed for 1,431 source files.
- File-size gate: passed for 2,096 handwritten files.
- Type checking: passed before the production build.
- Focused initial checks: 8 files, 36 tests passed. Final test evidence is recorded below when verification finishes.
- Lint, final full tests, and production build: verification in progress.

## Delivery and acceptance

- No database migration is required.
- Browser layout verification was attempted with a temporary preview of the real components and synthetic accounts. Chromium could not launch because the environment lacks `libnspr4.so`; no browser pass is claimed.
- No Docker rebuild or GCP deployment was performed. Authenticated live-site verification remains pending.
- Source acceptance remains open until final verification results are recorded. Live visual acceptance is separate.
