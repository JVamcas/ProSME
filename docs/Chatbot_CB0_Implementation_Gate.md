# Chatbot CB0 implementation contracts

Owner revision (October 10, 2026): the manual knowledge preview/approval/publication
flow below is historical evidence. Application publication is sufficient; current
behavior is the resource table and automatic synchronization documented in
[the resource activation gate](Chatbot_Resource_Activation_Implementation_Gate.md).

Date: 2026-10-10. Implementation delivered; acceptance pending written review.

The [agreed implementation plan](SME_Fund_AI_Chatbot_Implementation_Plan.md)
remains authoritative for the feature scope. CB0–CB2 run within the existing
`apps/platform` application and need neither named staff, a manually supplied
source list nor cloud provisioning.

## Code-backed contracts

- [Knowledge contracts](../apps/platform/src/modules/chatbot/domain/ChatbotKnowledge.ts):
  stable record identity, exact source revision/fingerprint, public citation,
  call/version scope, typed public facts, readable text, selection and inline issues.
- [Artifact contract](../apps/platform/src/modules/chatbot/domain/ChatbotReleaseArtifacts.ts):
  approved records bind release/hash; manifest records coverage, preparation time,
  object keys, bytes, SHA-256 and generations. CB3 will implement uploads and activation.
- [Storage keys](../apps/platform/src/modules/chatbot/infrastructure/ChatbotKnowledgeStorageContract.ts):
  use `GCS_DOCUMENTS_BUCKET` by default, with an optional
  `GCS_CHATBOT_KNOWLEDGE_BUCKET` override, and require configured storage only for
  artifact operations. Use
  `resolveGcsObjectPath()` and generated UUIDs under
  `<environment>/chatbot-knowledge-base/releases/<release-id>/`.
  Sharing the existing bucket does not grant access outside these exact artifact
  keys. There is no competing active pointer file.
- [Schema](../apps/platform/src/modules/chatbot/infrastructure/chatbot-knowledge.schema.ts)
  and [migration 0188](../apps/platform/drizzle/0188_chatbot_prepared_knowledge.sql):
  releases contain immutable selections/content; approvals bind exact hashes;
  preparation/approval audit is transactional and immutable; the singleton state
  reserves the sole database active-release pointer. No CB0–CB2 operation activates it.
- [Canonical permissions](../apps/platform/src/auth/authorization/permissions/ChatbotPermissionCatalogue.ts):
  separate read, prepare, approve, publish and withdraw knowledge permissions;
  separately assignable case read/resolve `assigned` and `all`, case assignment and
  retention permissions. Migration inserts catalogue entries without granting roles.
- [Case access contract](../apps/platform/src/modules/chatbot/application/ChatbotEscalationAccess.ts):
  assignment must match the authenticated user for contextual grants; knowledge
  rights grant no transcript access. Actual cases, histories, notification occurrences,
  cleanup and case routes remain CB5.

Implemented routes are `/admin/chatbot/knowledge`, `GET/POST
/api/admin/chatbot/knowledge`, `GET /api/admin/chatbot/knowledge/sources`, `GET
/api/admin/chatbot/knowledge/<release-id>` and `POST
/api/admin/chatbot/knowledge/<release-id>/approve`.
The public chat routes and staff escalation workspace remain reserved for CB4–CB6;
no placeholder endpoints expose private history.

## Recorded defaults and configuration

[Limits](../apps/platform/src/modules/chatbot/domain/ChatbotLimits.ts) and
[Zod schemas](../apps/platform/src/modules/chatbot/api/ChatbotKnowledgeSchemas.ts)
bound selections to 100 calls and 1,000 FAQs, source pages to 50, prepared records
to 5,000, each passage to 20,000 characters, a snapshot to 5 MiB and streamed
transport bodies to 64 KiB. Eligibility queries stop at 5,001 public rules/inputs
and reject exceeding 5,000; explanations stop at depth 12 and 200 nodes.
FAQ editor conversion stops at depth 30 and 5,000 nodes, blocking unknown elements.
Unsupported or private dependencies block approval rather than inventing meaning.

`CHATBOT_POLICY_JSON` is optional validated configuration read through
[ChatbotOperationalPolicy](../apps/platform/src/modules/chatbot/infrastructure/ChatbotOperationalPolicy.ts).
Defaults: 30-minute non-escalated session context, 90-day escalation/contact
retention, no recipients, and `UPDATE_OPEN_CASE` for repeated unresolved turns.
Allowed ranges: session 5–120 minutes, retention 1–365 days, at most 50 distinct
recipient user UUIDs. Recipient eligibility must be verified at CB5 delivery time.

Example configuration uses IDs assigned in the application, without requiring them now:

```json
{"sessionMinutes":30,"escalationDays":90,"contactDays":90,"recipientUserIds":[],"unresolvedPolicy":"UPDATE_OPEN_CASE"}
```

CB4 defaults recorded for later enforcement are a 2,000-character question,
20 context messages, 12 candidates, 512 output tokens, 15-second model timeout
and 10 requests per minute. These are not claims of an implemented chat runtime.

The existing notification engine remains the escalation delivery boundary:
transactional case/history/audit/occurrence, idempotency by unresolved turn,
authenticated staff link, no transcript/contact text in notification bodies,
no automatic knowledge learning. Existing monthly reporting will consume minimal
operational counters in later phases, never transcripts.

## Evidence and operational acceptance

Focused tests cover permission catalogue/group membership, denial and assignment
mismatch, bounded retention/recipients, request bytes, deterministic condition
limits, release-scoped storage configuration and environment-scoped paths.
Full validation and database results are recorded in the CB1/CB2 gates.

Before public activation, operational owners must verify staff grants, selected
coverage, recipients/case access, notice, retention/cleanup, the private bucket and
service identities, and provider retention/logging settings. No cloud operations,
provider calls, notifications or production migration were performed here.

Written CB0 acceptance: **pending**.
