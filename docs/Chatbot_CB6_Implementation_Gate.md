# CB6 implementation evidence

Date: 2026-10-10.

Status: visitor integration implemented; operational acceptance and written
stakeholder acceptance pending.

## Implementation

The existing `(public)` layout composes `ChatbotWidget` under its existing query
provider. Feature UI belongs to `modules/chatbot/ui/public`; the widget reuses
the shared drawer, buttons, links and RHF/Zod form controls. Its notice query and
private mutations use a focused TanStack hook and
`ClientChatbotConversationService`, calling the existing CB5 public routes.
The shared public response contract belongs to the chatbot domain, rather than
importing a repository into the browser.

Availability follows the application's existing default-off public switch.
Session consent is accepted by sending the first question after the compact
disclosure; there is no separate consent form or start button. The full notice
and actual retention periods are available under **Privacy details**. The shared
drawer has a floating presentation with a fixed composer and independently
scrolling conversation. It shows a welcome message and suggested questions, and
places help/restart links in an options menu. Support references and optional
contact collection are collapsed until requested. Standalone greetings receive
a deterministic welcome reply, including when AI is disabled, without loading
knowledge, calling the model, saving a support case or queuing a notification.

The widget shows exact answer text and approved citation links, call clarification,
automatic case references and truthful queued/missing-notification feedback.
Contact submission is optional and has separate consent. It goes only to the
existing protected-session contact route. Help/privacy/contact links are present
before consent. Unknown questions save a case independently of contact.

The hook keeps credentials and history in page memory, uses no browser storage
or transcript queries, disables automatic mutation retries and reuses an identical
turn ID/input when the visitor retries a failed question. Private mutations have
zero cache lifetime after becoming unobserved. Expiry clears page history and
resets private mutations; late replies are bound to their original session.
Starting a new conversation clears browser state; retained support cases follow
server retention. The conversation area uses the existing heatmap mask.
The shared drawer supplies focus management, Escape and scroll locking; its
existing viewport width and scrolling support narrow screens. Browser acceptance
has not been established by those implementation choices.

## Automated and browser evidence

`ChatbotVisitorUi.test.tsx` exercises the real widget, forms, query hooks and client
service with synthetic HTTP responses: disabled availability, disclosure before sending,
cited answer, source navigation, dialog focus/close/restore, heatmap mask, absence
of browser storage/query credentials, optional contact/consent, missing versus
queued notification, identical retry identity, session expiry and call selection.

`ChatbotVisitorFlowPostgres.test.ts` connects the frontend service to real public
route handlers, isolated PostgreSQL persistence and existing notification dispatch,
then protected staff routes. Synthetic knowledge storage, passage selection and
email sending adapters substitute for GCP/provider/inbox delivery. The journey
covers known question/citation, unknown question/case, retry, contact, notification
dispatch, denied history, authorized history and resolution. It must not be
described as real email delivery or deployed end-to-end acceptance.

`chatbot-responsive.spec.ts` prepares the public widget journey for the existing
desktop/mobile/tablet Playwright projects, with viewport bounds and keyboard
focus checks. It uses synthetic transport responses. Browser launch was attempted
using installed Chromium and failed because `libnspr4.so` is unavailable.
No browser or system dependency was installed. Responsive, visual and
screen-reader acceptance remains pending.

Automated test evidence: the full chatbot run exercised 176 tests in 30 files.
173 passed initially; three database tests hit the default five-second timeout
while competing checks were running. The four affected/final UI files were rerun
with one worker and a bounded 30-second database test timeout: all 19 tests passed,
including each of the three previously timed-out tests. This verifies all 176
distinct tests across the initial run and rerun; it is not a claim that the first
full command passed. The new complete CB6 database journey now declares its own
30-second timeout. The isolated PostgreSQL container was removed afterwards.

Architecture, form boundaries, component reuse, handwritten file limits,
working-tree/index whitespace checks and full platform type checking passed.
The final hook adjustment also passed focused lint and all five visitor DOM
tests again. Full platform lint passed with zero errors and 25 warnings in
files outside the new visitor implementation. No production build ran.

## Live readiness observations

Visitor layout revision validation (October 10, 2026): all 193 chatbot tests
passed in 33 files with one worker and 30-second test/hook timeouts against a
disposable PostgreSQL container. The initial sandboxed database run was blocked
by localhost `EPERM`; the complete rerun with database access passed. New coverage
includes first-send session creation, session-start failure/retry, suggested
questions, unsupported notice versions, Enter/Shift+Enter, collapsed optional
follow-up, and greeting persistence/replay with AI enabled and disabled. The
temporary database container was removed. Platform type checking and full lint
passed (zero errors, 25 existing warnings outside this change); architecture,
form boundaries, reuse, file limits and whitespace checks passed. Installed
Chromium still lacks NSS/NSPR/audio libraries, so the revised browser scenario
and visual acceptance remain unverified. No production build or deployment ran.

A read-only probe used the current local application's storage credential
resolver and configured bucket on October 10. The resolver provided explicit
credentials but no Google project. The configured local chatbot release prefix
returned zero objects in a bounded listing. Bucket metadata and IAM inspection
both returned HTTP 403. Therefore the probe cannot establish bucket privacy,
publisher access, exact active artifacts or deployed environment readiness.
It performed no uploads, IAM changes or application setting changes.

Provider cache inspection could not proceed with the unresolved project.
No model call was made; provider logging/caching/abuse-monitoring configuration,
live answer selection and retention remain unverified. The local environment
also has no chatbot processor secret configured. Deployed configuration and
scheduling were not verified. No application migration, deployment, real inbox
delivery or public activation was performed.

## Handover and acceptance

See [Chatbot_CB6_Handover.md](Chatbot_CB6_Handover.md) for visitor/staff instructions,
worker setup, troubleshooting, shutdown/recovery, the deployed acceptance journey
and required written stakeholder record. No stakeholder sign-off is supplied by
this implementation. Keep CB6 acceptance pending until browser review, live
GCP/provider checks, actual staff notification/history/resolution and that written
record are complete.
