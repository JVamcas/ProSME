# Funding call public interaction

Date: 2026-10-12

The funding-call list now uses the existing ActionMenu for Clone, Delete,
Enable/Disable public interaction, and the existing amendment action when
permitted. Clone/delete permissions and the delete confirmation remain enforced.

The interaction flag belongs to the stable funding call and takes effect
immediately across versions. Disabled calls remain visible as non-clickable
public cards. Direct public/portal detail access, eligibility questionnaires and
evaluation, application creation, and draft submission are blocked server-side.
Enabling preserves lifecycle/date restrictions. Submitted applications and
workflow processing are unaffected. Disabled calls are excluded from sitemap
detail links and chatbot funding/eligibility sources.

Separate canonical enable-all and disable-all permissions protect the route and
backend service. Updates check the expected row version and write the flag and
audit entry atomically. The existing publication pointer, status and immutable
configuration are preserved. The client mutation refreshes authoritative data.

## Evidence

- 48 funding-call/eligibility unit files: 237 tests passed.
- Disposable PostgreSQL: 7 tests passed for migration defaults/repetition/grants,
  persistence, audit rollback, optimistic concurrency, blocked application
  creation, disabled readiness, public projection, and existing version reads.
- Disposable PostgreSQL chatbot synchronization: 9 tests passed, including
  call-level disable/enable filtering of public call and eligibility sources.
- Type checking and repository lint passed (26 existing lint warnings).
- Architecture, form architecture and component reuse checks passed.
- File-size check passed after extracting database fixture setup into its own
  focused support module; the database tests passed again after extraction.
- Disposable test containers were removed. No production build was run.

## Rollout and acceptance

Apply `0198_funding_call_public_interaction.sql` with the normal migration runner
before starting this code. Existing calls default to enabled. Existing resume
authority receives the explicit enable grant; suspend authority receives the
explicit disable grant. Other roles require deliberate grants.

The target application database was not modified and no deployment was performed.
Browser/deployed acceptance remains pending; the evidence above establishes
implementation, policy, and disposable database behavior only.
