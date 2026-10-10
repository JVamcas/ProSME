# Chatbot CB1 source preparation and persistence

Date: 2026-10-10. Implementation delivered; acceptance pending written review.

## Implementation

Source queries stay in their owning modules and are coordinated by
[ServerChatbotKnowledgeService](../apps/platform/src/modules/chatbot/application/ServerChatbotKnowledgeService.ts).
Preparation persists the exact selected revisions and deterministic readable
records in one transaction, with an atomic audit entry.

- [Funding projection](../apps/platform/src/modules/funding-calls/infrastructure/FundingCallKnowledgeRepository.ts):
  current publication snapshot only, SQL public-field allowlist, lifecycle filter
  `SCHEDULED/LIVE/CLOSED`, public decimals retained as strings and no invented
  currency. Working form/workflow/storage bindings are excluded. Source links reuse
  the existing funding-call route helpers, now owned by the domain.
- [Eligibility projection](../apps/platform/src/modules/eligibility/infrastructure/EligibilityKnowledgeRepository.ts):
  exact snapshot-bound versions, `PUBLISHED/RETIRED`, public `SELF_CHECK/BOTH`
  rules and public self-check inputs only. Condition definitions and public question
  dependencies are fingerprinted; private screening mappings are never loaded.
- [FAQ projection](../apps/platform/src/modules/content/infrastructure/FaqKnowledgeRepository.ts):
  published main CMS rows with approved review status, fixed narrow columns,
  bounded numeric keyset pages, no preview/version tables, notes or static fallbacks.
- [FAQ conversion](../apps/platform/src/modules/content/domain/LexicalPlainText.ts):
  paragraphs, headings, lists, quotes and public links retain readable meaning;
  unsupported editor nodes or unsafe links produce blocking issues.
- [Eligibility explanations](../apps/platform/src/modules/chatbot/engine/EligibilityExplanation.ts):
  preserve AND/OR nesting, equality/ordering, membership/exclusions, inclusive
  ranges, dates and emptiness; option labels and explicit severity remain readable.
  Computed/relative-time/unknown conditions and private/unavailable dependencies
  are blocked. Fix the public source and prepare a new release to resolve issues.
- [Preparation](../apps/platform/src/modules/chatbot/application/PrepareChatbotKnowledge.ts):
  source availability, missing data and contradictory duplicate FAQ answers are
  inline issues. Supported conflict detection does not claim semantic comparison
  of arbitrary prose; content owners must review conflicting guidance as well.

Read locks protect publication rows, FAQs, bound versions, public rules, public
question definitions and condition groups through preparation/approval writes.
Queries follow one transaction connection and deterministic lock order; eligibility
depends on earlier publication bindings and FAQ pages on the preceding cursor.
There is no query-per-call/rule loop. Independent workspace/detail reads run concurrently.

## Evidence

`npm run test:chatbot` with `CHATBOT_TEST_DATABASE_URL` runs unit/UI/route tests
and real PostgreSQL tests. The database suite creates a uniquely named schema,
installs minimal source-table fixtures matching actual repository/Payload columns,
applies migration 0188 twice, and removes its schema afterward.
This tests real PostgreSQL SQL/transactions, not the full historical migration chain.

The disposable PostgreSQL fixture includes 123 approved published FAQs plus draft
and unapproved rows; live, closed, draft and suspended calls; distinct published
and retired bound versions; a different draft working binding; and private screening
messages, private form/workflow/storage bindings and review notes. Tests verify complete pagination,
search/cursors, projected shape, public exclusion and exact version association.

Unit tests cover grouping, severity, thresholds/exclusions, private and unsupported
dependencies, changed public question definitions, FAQ conversion, missing sources,
limits and stable identities across content changes.

Static checks, lint and typecheck are detailed with final results in the CB2 gate.

## Outstanding acceptance

Migration 0188 is registered in the Drizzle journal and schema registry but has
not been applied to the application/deployed database. Operational owners must
select actual published sources in the new staff workflow after migration and grants.
Prepared snapshots are not published cloud artifacts.

Written CB1 acceptance: **pending**.
