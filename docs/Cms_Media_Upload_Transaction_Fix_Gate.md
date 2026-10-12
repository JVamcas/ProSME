# CMS media upload transaction fix

Date: 2026-10-12

## Problem and cause

The Events image picker failed while creating media. The app container logged
`Not Found` from the cloud-storage plugin's internal metadata update after
uploading `pic3-1.png` and `pic2-2.png`.

Payload's PostgreSQL adapter supplied its pinned `pg` 8.20.0 driver, while
Drizzle imported the application's `pg` 8.23.0 driver. In the production bundle,
the drivers had different Pool identities and the alternate Pool constructor
name was removed. Drizzle's Pool detection therefore failed. Transactions used
pool queries without checking out a client. The pool's idle timeout could close
the connection during a longer GCS upload and roll back the new media record.
The later metadata update then returned 404.

## Change

`platform/database/PayloadPostgresAdapter.ts` supplies the application's shared
`pg` driver through Payload's supported adapter option. `payload.config.ts` uses
this adapter. Drizzle can recognize the Pool by identity and retain a checked-out
client until the transaction finishes. No database migration is required.

## Evidence and acceptance

- Reproduced the original `pic3.png` upload using the compiled CMS multipart
  route and real GCS. It returned 404 after inserting media ID 187. The app
  database reported no transaction in progress.
- The compiled diagnostic confirmed that the old transaction's client was
  the Pool itself and that its constructor name was empty.
- Injecting the shared driver into a separate diagnostic process changed the
  transaction to a checked-out client. The same image returned HTTP 201 with
  its original and four generated WebP variants. Synthetic media ID 189 and
  its GCS files were removed afterward.
- The permanent disposable-PostgreSQL regression test removes constructor
  names, sets a 25 ms pool idle timeout, and delays storage writes by 150 ms.
  It verifies shared driver identity, multipart HTTP 201, five storage writes,
  and the committed media record. Together with existing media storage tests,
  11 focused tests passed.
- Architecture, form architecture, component reuse, and file-size checks passed.
- Type checking and focused ESLint passed. Full lint passed with 26 existing
  warnings in other files and no errors.

Focused acceptance: the reproduced transaction failure is corrected by sharing
the driver, and the slow-upload regression passes.

## Runtime acceptance still required

The diagnostic configuration was applied only inside a separate short-lived
process. The running app server has not loaded the source change. Rebuild the
local app image and restart the app container, then verify uploading through
the Events image picker. A production build requires an explicit user request
under the repository rules. No production build or deployment was performed.
