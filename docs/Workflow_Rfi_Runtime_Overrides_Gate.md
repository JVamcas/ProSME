# Request information runtime response settings

Date: 2026-10-04

## Scope and behavior

The Request Information action's Behaviour step now has independent runtime
override switches for response deadline, on expiry, and reminder day offsets.
The Review step shows each default and whether its override is allowed.

When staff issue a request, response settings are prefilled from the pinned
action definition. Only enabled settings are editable and sent as overrides.
Locked settings remain visible. The server independently rejects supplied
overrides for disabled settings, including values equal to their defaults.
Omitted overrides use the configured values.

Response deadlines are whole days from 1 through 365. Reminders are at most 20
unique positive whole-day offsets after request creation, strictly before the
effective response deadline. An enabled reminder setting may be cleared to send
no reminders. A shortened deadline is rejected if locked default reminders would
fall on or after it; the runtime form attaches this error to the editable deadline.

Close request remains the only selectable expiry choice. Historical Return and
Escalate defaults remain readable and effective when not overridden. Their
existing expiry handling is preserved.

The effective settings are passed into the existing transactional request
creation and saved on that request. The workflow definition is not changed by
execution. Existing permission and task-context checks, audit, notification,
idempotency, and expiry/reminder processing continue through the same services.
Automatic stage document requests use definition defaults.

## Persistence and compatibility

The switches are optional properties in the existing action configuration JSON.
Missing switches mean all overrides are disabled. Designer saves omit the switch
object when all switches are disabled. No schema changes, data backfill, new
permission codes, or database migration are required. Existing published
definitions and requests are not rewritten.

## Verification and acceptance

Local technical acceptance is recorded for the implementation above. Deployment
and live browser acceptance are outside this record.

- Focused definition, task form, UI, availability, domain policy, lifecycle hook,
  and protected execution suites: 68 tests passed across eight files.
- Final full default suite: 2,317 passed, 209 skipped, no failures.
- Repository-wide ESLint: passed, with 16 warnings in untouched files.
- Changed-source and changed-test ESLint: passed without warnings.
- Type checking: passed.
- Architecture and form boundary gates: passed for 1,400 source files.
- File-size gate: passed for 2,050 handwritten files. Affected functions also
  remain below the repository's 200-line limit.
- Production build: passed, including TypeScript and all 86 static pages.
- Whitespace/diff check: passed.

Skipped tests are not claimed as database integration evidence. No deployment,
application database mutation, or live reminder/email delivery is claimed.
