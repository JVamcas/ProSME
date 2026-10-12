# Chatbot Support role bootstrap evidence

Date: 2026-10-12

Migration `0196_chatbot_support_role.sql` creates the empty `chatbot_support`
role, displayed as **Chatbot Support**. Initial grants are the canonical
`chatbot.escalation.read.all`, `chatbot.escalation.assign.all` and
`chatbot.escalation.resolve.assigned` permissions. Members can review the queue,
assign an authorized staff member, and resolve their assigned cases. Knowledge,
settings and user/role administration permissions are not granted.

The migration binds an initially empty chatbot case notification audience to
this role through the existing EMAIL channel. Existing recipient configuration
is preserved. An empty role remains valid: a visitor case is saved without
claiming a queued staff notification. The existing recipient checks enforce
active staff status, case access and current membership at delivery time.

Authorized administrators use existing user/access controls to manage membership.
Lenis requires the existing role-management permission to do this; this change
does not grant access to any named person. Bootstrap replay preserves staff edits
to the role, grants, membership and routing.

## Local verification

- Architecture, form architecture and component reuse checks passed.
- File-size check and TypeScript type checking passed.
- Repository lint passed with 27 existing warnings and no errors.
- Four integration tests passed against disposable PostgreSQL 16: initial role
  and routing creation with no existing rule; exact permission grants and empty
  team behavior; preservation of administrator changes and preconfigured
  recipients; member notification, assigned resolution and revocation checks.
- Seven existing case-queue authorization scope tests also passed (11 tests total).

## Operational acceptance pending

The migration has been tested on a disposable database, not applied to a running
application database. Real staff membership, published email template, scheduled
notification processing, inbox delivery and browser acceptance remain unverified.
No production build or deployment was performed. This record is implementation
evidence, not client acceptance.
