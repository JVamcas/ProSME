# RFI applicant and reviewer routing

Date: 5 October 2026

## Corrected behavior

The operations application RFI list previously sent every viewer to the staff
task page. A user who both owned the application and had staff access therefore
could not reach the existing applicant response form from that list.

The contextual RFI projection now checks the authenticated viewer's canonical
own-read and own-respond permissions together with the database application owner
and RFI recipient. An authorized applicant receives a portal request link and,
for an open request before its deadline, a Respond now action. Read-only applicant
access and historical requests retain View request links. Other staff viewers
retain the existing task request link and reviewer controls.

The existing applicant request page still enforces ownership on the server. It
now passes the own-respond permission explicitly to the response workspace so
read-only applicants cannot see editable response controls. Response submission,
document evidence, reviewer follow-up, closure, and COI gating continue through
their existing services.

## Preserved workflow policy

An applicant response changes the request to RESPONDED. Only OPEN requests block
task completion and approval under the existing policy. Explicit reviewer closure
is not newly required. The user explicitly excluded that policy change from this
fix on 5 October 2026.

## Verification and delivery

- Focused routing, response submission, permissions, application transports,
  applicant workspace, uploaded evidence, and reviewer controls: 46 tests passed
  across six files.
- Type checking, architecture/form boundaries, file-size gate, and lint passed.
  Lint reported zero errors and fourteen existing warnings.
- Isolated PostgreSQL checks: eight ownership/recipient/permission projection tests
  passed, plus all seven existing review-threshold checks. The server ran from
  official Ubuntu binaries extracted under `/tmp`, with a disposable local data
  directory. No system package installation or existing database changes.
- Production build passed (`ENVIRONMENT=local scripts/container/build.sh`),
  including TypeScript, all 86 static pages, and build traces.
- Full suite passed: 2,382 tests passed and 224 skipped across 614 files
  (`npm run test --workspace @prosme/platform -- --maxWorkers=2`). The isolated
  PostgreSQL checks above are opt-in and are skipped in the ordinary full run.

No schema, migrations, or dependency changes. No GCP deployment or live browser
acceptance is claimed. Local technical acceptance passed against the final
implementation, with the existing lint warnings and skipped coverage recorded
above. GCP delivery and live browser acceptance remain pending.
