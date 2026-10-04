# Production data reset runbook

## Status

This runbook is a design and approval checklist. It is not authorization to
reset an environment.

As of 30 September 2026, a production reset must not be attempted because:

- the only deployment found on the application VM is `/opt/prosme-dev`, whose
  server-local environment is `dev`;
- the repository's `.env.prod` also declares `ENVIRONMENT=dev`;
- PostgreSQL runs on the standalone `postgresql-1-vm` Compute Engine instance;
- its `postgresql-1-vm` persistent disk has no snapshots and no attached
  snapshot schedule; and
- `scripts/reset-local-data.sh` and `scripts/seed/reset-platform-data.ts`
  deliberately permit resets only when `ENVIRONMENT=local`.

Do not remove or weaken the local-only checks to perform a production reset.

## Intended reset scope

The current local reset truncates application, applicant-profile,
funding-call, form, eligibility, workflow, task, and transactional-outbox
tables. It preserves platform users, identities, roles, grants, capabilities,
and the funding-call governance policy.

Before a production implementation is approved, generate and review the exact
table inventory from the target database. Do not rely on a stale table list in
this document.

The reset does not remove Firebase users or Google Cloud Storage objects. Any
request to reset those systems is a separate operation with a separate backup,
inventory, and approval.

## Mandatory prerequisites

Record all of the following in the change ticket:

1. A named production deployment whose server-local configuration declares
   `ENVIRONMENT=prod`.
2. The expected PostgreSQL server address, port, database name, and a stable
   infrastructure identifier for the production database VM or managed
   instance.
3. The approved maintenance window, accountable operator, business owner, and
   rollback decision-maker.
4. An application write freeze covering the web application, schedulers,
   workers, migrations, and any external writers.
5. A fresh encrypted logical backup created with `pg_dump` in custom format.
6. A SHA-256 digest and object-storage or offline location for that backup.
7. A successful restore rehearsal into an isolated PostgreSQL database,
   including row-count checks for the tables that the reset preserves.
8. A recoverable infrastructure snapshot or documented equivalent in addition
   to the logical backup.
9. Reviewed pre-reset row counts for every table selected for truncation and
   every table promised to be preserved.
10. Explicit final approval that quotes the production target fingerprint and
    the backup identifier.

## Required tooling change

Implement production reset support as a separate command. It must not turn the
local reset into a general-purpose reset.

The production command must fail closed unless all of these checks pass:

- `ENVIRONMENT` equals `prod` exactly;
- the actual database name, server address, and infrastructure identifier equal
  separately configured expected values;
- the operator supplies a high-entropy confirmation containing the deployment
  name and current UTC date;
- a backup manifest exists and contains the expected target fingerprint,
  creation time, SHA-256 digest, and successful restore-rehearsal result;
- the backup is recent enough for the approved maintenance window;
- all application writers are stopped;
- the generated reset-table inventory is non-empty and matches an attached,
  approved inventory; and
- the preserved-table counts are captured inside the reset transaction.

The command must print the target fingerprint and table inventory, then stop.
Execution requires a second invocation with the exact one-time confirmation
printed by the first invocation. A generic flag such as `--confirm-reset` is
not sufficient for production.

## Execution sequence

1. Announce the maintenance window and disable inbound application traffic.
2. Stop every application process that can write to PostgreSQL.
3. Verify that no unexpected application sessions or active transactions
   remain.
4. Capture the target fingerprint, migration state, table inventory, and row
   counts.
5. Create the logical backup, calculate its digest, copy it off the database
   VM, and complete the isolated restore rehearsal.
6. Create or verify the additional infrastructure recovery point.
7. Obtain final approval containing the target fingerprint and backup ID.
8. Run the production reset command's dry run and compare its inventory with
   the approved inventory.
9. Run the one-time confirmed reset. Truncation and preserved-table checks must
   occur in one database transaction protected by an advisory lock.
10. Apply required baseline seeds. Keep traffic disabled until all seeds and
    validation checks pass.
11. Validate preserved-table counts, seeded records, migrations, application
    health, authentication, authorization, and background processing.
12. Re-enable workers and traffic, monitor errors, and attach evidence to the
    change ticket.

## Rollback

If truncation, seeding, or validation fails, keep all writers stopped. Restore
the verified logical backup into an isolated database first, validate it, and
then perform the approved cutover or restore procedure. Do not attempt ad hoc
data repair while production traffic is enabled.

The reset is complete only after recovery evidence, final row counts, health
checks, and business-owner acceptance are recorded.
