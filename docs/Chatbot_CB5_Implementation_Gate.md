# CB5 implementation evidence

Status: implemented; written staff/retention/notification acceptance pending.

Public `GET /api/chatbot/sessions` provides the notice/version and actual retention
periods before consent. Session creation requires that version and explicit
consent, and is disabled until authorized staff enable it through **Chatbot >
Settings**. Opaque credentials
have 256 random bits and bind the conversation ID; only their hash is stored.
Every public turn/contact operation verifies credential binding and session expiry.
No public transcript-read/download route exists. Call context and history are
server controlled. Turn IDs bind exact input hashes; a unique pending turn and
claim lease prevent concurrent/retried duplicate processing. Failed completion
releases its claim for immediate retry. Crash recovery expires claims after two
minutes. Completed turns are retained only until their session expires.

A completed unresolved turn atomically saves its screened question/history,
evidence or service-failure reason, public release/source references, protected
case, audit, notification occurrence/deliveries and conversation response. Later
unresolved turns update the existing open case; after resolution they create a
new case. Notification retries operate on the original occurrence, not the case
creation command. Model/storage outages produce SERVICE_FAILURE, not knowledge
gap. The response reports `notificationQueued` only when delivery was queued;
an unconfigured/unauthorized audience does not imply staff notification.

The configurable `chatbot.case.created` event uses the existing notification
rules, recipient selectors, templates, outbox, retry/backoff and delivery history.
Migration `0190_chatbot_conversations_and_cases.sql` registers its catalogue/event
without staff names or delivery recipients. The normal notification seed adds
its template target; import/publish the provided `chatbot-case-created.html` through
the existing template workflow and configure authorized staff recipients before
live delivery. Only the case reference and authenticated staff URL enter the
notification body. Recipient permission, current assignment, active staff account,
email and rule/channel binding are rechecked before each delivery attempt.

Staff queue/details/state/assignment routes live at `/api/admin/chatbot/cases`;
UI lives at `/admin/chatbot/cases`. Read-all and read-assigned policies are enforced
before history access; assigned scope requires the actual current assignment.
State updates separately require resolve-all or contextual resolve-assigned.
Assignment requires assign-all plus current case read access, and targets only
active staff permitted to read cases. State and assignment updates use row versions
and transactional audits. Staff see screened history, optional consented contact,
assignment, new/in-progress/resolved state and a required resolution note on
resolution. Case history is never copied into knowledge or monthly aggregates.
The existing staff sidebar has a dedicated **Chatbot** section with **Escalated
cases** and **Knowledge base** links, each filtered by its canonical read permission.
It also contains **Settings**, protected by `chatbot.settings.read.all`; changes
require the separate `chatbot.settings.update.all` permission. The page uses the
existing checkbox fields/buttons with React Hook Form and Zod, the TanStack hook,
client service and `/api/admin/chatbot/settings` GET/PATCH routes. Migration
`0191_chatbot_application_settings.sql` creates persisted switches, initialized
off, and before/after audit records. Repeating it preserves staff choices.

Both switches apply application-wide without restart; old `CHATBOT_PUBLIC_ENABLED`
and `CHATBOT_MODEL_ENABLED` environment values are ignored. Public availability is
checked at creation, on every turn/contact operation and inside final completion.
Turning it off prevents new sessions, existing session operations and in-flight
completion. A session may resume after re-enabling while it remains unexpired.
AI answers require the AI switch and valid provider connection configuration.
Turning AI off suppresses pending answers and future provider requests; while the
bot remains on, unresolved questions can still become staff cases. Turning AI on
requires a configured AI provider; missing or invalid provider setup never
prevents turning the bot or AI off. Row versions prevent competing saves, and
settings/audit writes are atomic. Reads use PostgreSQL without instance caches.

Defaults remain 30-minute sessions, 90-day cases/audits and 90-day optional contact.
`CHATBOT_POLICY_JSON` provides bounded operational defaults; optional recipient IDs
are an additional allowlist, with the notification rules owning recipient choices.
Authenticated retention configuration uses `/api/admin/chatbot/retention` and the
canonical retention-update permission; it changes only retention periods and
records an audit. Shorter settings immediately shorten persisted expiry. Expired
history/contact is unavailable before cleanup. The internal processor deletes up
to 100 expired cases/sessions/contacts and 1,000 old rate/audit records per run;
repeat until caught up. Session deletion cascades turn responses; cases survive
session expiry until their own deadline. There are no transcript caches. Generic
chatbot route error handling excludes raw SQL/provider exceptions from logs.

Automated evidence: real isolated PostgreSQL case/audit/occurrence rollback and
retry tests; deduplication/open-case reuse; cross-conversation credentials;
client-history rejection; server context/contact separation; in-flight withdrawal;
allowed/denied/assignment-mismatch cases and protected routes; row-version conflict;
unauthorized assignees/recipients; actual notification processor failure/backoff/
retry without duplicate cases; revoked recipients before dispatch; immediate expiry,
shorter retention and physical cleanup. Shared controls/table and RHF/Zod forms
are covered by architecture/reuse gates and focused DOM tests.
Queue repository tests also verify SQL assignment/state/expiry filtering, narrow
projections without history/contact, stable timestamp/ID ordering and pagination
across the 50-row boundary. Final automated validation is recorded in
`Chatbot_CB3_Implementation_Gate.md`.

Live acceptance still requires approved notice/retention settings, configured
recipient/template rules, scheduled cleanup, actual protected staff review and
observable deployed notification delivery. No live email, browser review or public
widget rollout was performed; the widget/rollout is CB6.

Settings change validation (October 10, 2026): all 136 chatbot tests in 24 files
passed, including 33 tests against disposable PostgreSQL. New evidence covers
default-off settings, obsolete environment switches having no effect, permission
denial, strict API input, shared navigation/forms, provider readiness, concurrent
saves, audit rollback, existing-session shutdown, in-flight answer suppression,
retry after re-enabling and provider checks before credential resolution/dispatch.
Platform type checking, architecture/form boundaries, component reuse, file-size
limits and reuse guard regression checks passed. Migration 0191 was tested only
in disposable PostgreSQL; it has not been applied to an application database.
Full platform lint passed with zero errors and 24 existing warnings; staged and
working-tree whitespace checks passed. The disposable test container was removed.
