# SME Fund AI Chatbot Implementation Plan

Date: 2026-10-10.

Status: implementation plan based on the agreed design. No implementation or
acceptance gate is recorded as passed. Implementation can proceed from CB0/CB1
using the decisions below; deployment evidence is recorded separately.

## 1. Scope and authority

Follow [AGENTS.md](../AGENTS.md), the
[project structure contract](SME_Fund_Project_Structure_Contract_FINAL.md) and
[client scope](SME_Fund_AI_Chatbot_Client_Scope.md).
Keep the feature inside the existing deployable application at `apps/platform`.

The initial knowledge sources are:

1. Explicitly selected, published funding calls.
2. Public eligibility guidance derived from each selected call's exact bound
   eligibility ruleset version.
3. Explicitly activated, approved published FAQs.
4. Published programme contact details.

Owner revision (October 10, 2026): application publication is sufficient.
The knowledge page is a resource table with linked names, Funding/Eligibility/
FAQ/Contact types, Active/Inactive status and Last updated. Staff activate or
deactivate checked resources in bulk. Published changes synchronize automatically;
there is no additional staff preview, approval or publication workflow.
The chatbot answers from verified files containing active public resources with
source links. Unresolved questions automatically create a protected follow-up
case and notify designated staff with a link to the conversation history.

These decisions are settled and must not be reopened as prerequisites to coding.
Resource activation and support recipients are application configuration,
not a required list of named people or records before development can begin.

Later approved documents and programme pages must fit the same knowledge-record
contract. Build that extension boundary now; do not implement their ingestion in
the initial phases.

Exclude personal application access, applicant uploads, internal screening
sources, eligibility decisions, workflow actions, live operator chat, automatic
learning from conversations, model fine-tuning and a separate application.
A vector database is not part of the initial file-search design.

The client scope also identifies monthly interaction reporting. Capture the
minimal operational counters needed for that dependency, but this plan does not
add report templates, schedules or delivery screens. Their recipients, metrics
and format remain a separate reporting agreement.

## 2. Current repository evidence

These are code findings, not confirmation of deployed content or GCP readiness.

| Area | Existing implementation | Consequence for this feature |
| --- | --- | --- |
| Funding publication | [Publication service](../apps/platform/src/modules/funding-calls/application/ServerFundingCallPublicationService.ts) and [repository](../apps/platform/src/modules/funding-calls/infrastructure/FundingCallPublicationRepository.ts) validate approval/readiness, save a publication snapshot and update `currentPublishedVersionId` | Prepare knowledge after committed publication, using that exact snapshot |
| Public funding projection | [Public repository](../apps/platform/src/modules/funding-calls/infrastructure/PublicFundingCallRepository.ts) joins the current publication snapshot; [transport](../apps/platform/src/modules/funding-calls/api/PublicFundingCallTransport.ts) defines public fields | Reuse its semantics through a narrow source-owned export query; do not serialize the complete snapshot |
| Eligibility rules | [Rule model](../apps/platform/src/modules/eligibility/domain/EligibilityRule.ts) includes condition references, execution mode, failure type and applicant message | Resolve conditions and preserve their logical grouping and meaning |
| Public eligibility | [Self-check service](../apps/platform/src/modules/eligibility/application/ServerPublicEligibilitySelfCheckService.ts) selects `SELF_CHECK` and `BOTH` rules and exposes advisory guidance | Use this public boundary plus explicit KB review; exclude `SCREENING` rules and private bindings |
| Version binding | [Binding service](../apps/platform/src/modules/eligibility/application/ServerEligibilityBindingService.ts) currently resolves through [funding opportunity integration](../apps/platform/src/modules/funding-calls/ServerFundingOpportunityIntegration.ts), which reads the funding-call row | The KB must instead bind from the same publication snapshot used for call content |
| Retired rulesets | [Evaluation repository](../apps/platform/src/modules/eligibility/infrastructure/EligibilityEvaluationRepository.ts) accepts `PUBLISHED` and `RETIRED` versions at runtime | Retirement alone does not revoke an exact version still bound to a public call |
| FAQ publishing | [FAQ collection](../apps/platform/src/payload/collections/content/FAQs.ts) has Lexical answers and approval-on-publish through the [publish guard](../apps/platform/src/payload/access/can-publish-content.ts) | Export fixed approved/published projections; exclude internal review notes |
| FAQ reads | [Website reader](../apps/platform/src/modules/content/infrastructure/PayloadContentRepository.ts) limits FAQs to 50; [content queries](../apps/platform/src/modules/content/ServerContentQueries.ts) can serve authorized draft previews | Add bounded pagination for a complete export; never inherit preview mode |
| Storage | [GCS adapter](../apps/platform/src/integrations/storage/GoogleCloudDocumentStorage.ts) is server-only and uses `GCS_DOCUMENTS_BUCKET`; [path helper](../apps/platform/src/integrations/storage/GcsObjectPath.ts) prefixes the deployment environment | Reuse the existing private bucket with a release-scoped knowledge namespace; a separate KB bucket is an optional override |
| Notifications | [Occurrence service](../apps/platform/src/modules/notifications/application/ServerNotificationOccurrenceService.ts) captures transactional occurrences | Extend the existing delivery engine rather than introducing a separate email sender |
| Contact submissions | Existing engagement storage supports contact details and follow-up state | Reuse matching controls/contracts where appropriate; it does not provide chat history or automatic escalation delivery |

The chatbot widget, KB export/review workflow, retrieval runtime, model adapter,
conversation history and automatic chatbot escalation are not implemented.

## 3. Ownership and application boundaries

Proposed feature ownership is `src/modules/chatbot`, following the standard
module convention. Create only folders required by the active phase:

```text
apps/platform/src/modules/chatbot/
├── domain/          knowledge records, release and escalation policies
├── engine/          deterministic passage search and selection validation
├── application/     ServerChatbot*Service.ts use cases
├── infrastructure/  schemas, repositories, storage and model adapters
├── api/             Zod transport schemas and response contracts
├── ui/
│   ├── public/      visitor chat
│   └── operations/  knowledge review and escalation workspaces
└── ClientChatbotService.ts
```

Funding-call, eligibility and FAQ queries remain in their owning modules'
infrastructure layers, exposed through focused backend queries/integrations.
Chatbot services coordinate those contracts; they do not query application tables
or reach into private source records directly.

Proposed routes, to finalize in phase CB0:

- Staff knowledge workspace: `/admin/chatbot/knowledge` under `(operations)`.
- Staff escalations: `/admin/chatbot/escalations` and a protected case detail.
- Public chat transport: explicit routes under `app/api/public/chatbot`.
- Staff transport: explicit routes under `app/api/admin/chatbot`.
- Visitor widget: composed into the existing `(public)` website layout.

Client state follows component -> TanStack Query hook -> frontend client service
-> API route -> backend service -> repository/integration. Pages only compose
views. Every handwritten form uses React Hook Form, Zod and `zodResolver`.
Reuse shared tables, drawers, buttons, dialogs, field controls and error toasts.
Do not add another navigation/component system or wrap Payload internals in the
platform query flow.

Define granular permission codes, descriptions and groups only in
`src/auth/authorization/permissions`. Required operations include resource
reading, activation and deactivation,
escalation reading, assignment, resolution and retention administration.
Use separate `assigned` and `all` scopes where applicable. Verify assignment
against the case before reading its transcript or changing it. Knowledge
permission must not implicitly grant transcript access. Firebase authenticates
staff; PostgreSQL owns their grants. Do not use `capabilities.ts`.

## 4. Persistence and storage

| Material | Authoritative location |
| --- | --- |
| Original calls, ruleset versions and CMS FAQs | Existing PostgreSQL tables |
| Resource activation, source bindings, automatically generated files and audit | Chatbot-owned PostgreSQL tables |
| Verified published `manifest.json` and `knowledge.json` | Existing private GCP Cloud Storage bucket under the chatbot namespace; optional bucket override |
| Active release, file keys/generations, sizes, checksums and withdrawal state | PostgreSQL |
| Escalations, retained screened transcripts and optional contact details | Separate protected chatbot-owned PostgreSQL tables |
| Delivery occurrences, retries and provider status | Existing notification infrastructure |

Proposed table responsibilities are sources/source revisions, releases/release
records, approvals/artifacts, active-release configuration, conversations/
messages and escalations. Final names and minimal table count are a CB0 design
deliverable. Application tables use `app_`; schemas/repositories belong to the
chatbot infrastructure folder and every database change requires a migration.

All multi-record database writes, audit records and notification/export requests
must be transactional. PostgreSQL and GCS do not share a transaction: upload and
verify a unique artifact first, then activate its reference transactionally.
Handle failed uploads, concurrent publication, retry and orphaned artifacts.

Use the agreed prefix through `resolveGcsObjectPath()`:

```text
gs://<knowledge-bucket>/<environment>/chatbot-knowledge-base/
└── releases/
    └── <release-id>/
        ├── manifest.json
        └── knowledge.json
```

Release IDs are generated and stable. Never overwrite a published release.
PostgreSQL is the only authoritative active-release pointer; do not maintain a
competing `active-release.json`. Use `GCS_DOCUMENTS_BUCKET` by default; an optional
`GCS_CHATBOT_KNOWLEDGE_BUCKET` override may use the same or a separate private bucket.
Unset or blank override values intentionally use the existing bucket; invalid
nonblank overrides fail validation. Read only the exact approved release artifact
keys, never applicant documents or arbitrary bucket objects. Keep the bucket private.
Reuse client/authentication infrastructure without broadening existing storage
access. Record actual publisher/read permissions before deployment; a dedicated
bucket by itself does not isolate credentials inside the single application.

## 5. Knowledge record and manifest contract

One common record envelope supports the initial sources and later materials:

| Field | Responsibility |
| --- | --- |
| `id` | Stable record identity within its pinned source revision |
| `kind` | `funding-call`, `eligibility-criterion`, `faq` or `contact` |
| `title` | Readable staff/search label |
| `source` | Source type/ID, exact publication/version or content fingerprint, public citation URL and section when applicable |
| `scope` | Funding-call ID and exact ruleset version where relevant; global FAQs have no automatic call association |
| `approval` | Internal immutable file binding for application-published content; no additional staff approval |
| `facts` | Allowlisted public facts with types, units and null semantics |
| `text` | Approved readable passage that may be returned to a visitor |

`manifest.json` records schema/release version, source coverage, knowledge file
keys, byte counts, checksums and preparation timestamp. `knowledge.json` contains
the common records. Initial search uses bounded files loaded by the server;
GCS stores artifacts and is not the passage search engine.

Do not serialize database entities, full Payload documents, Lexical editor
metadata, approval notes or complete funding publication snapshots. Do not
export form/workflow bindings, private storage keys, identities or screening
source mappings. Public document links are citations only in the initial
release; they do not authorize reading/answering from the document contents.

### Source-specific preparation

- Funding calls: use current published snapshot fields for description, dates,
  amounts, instrument, thematic area, public eligibility summary, public contacts
  and document links. Preserve decimal values/units without invented currency
  assumptions. Project publication revision and lifecycle metadata explicitly.
- Eligibility: follow the snapshot's bound version, resolve conditions and
  input definitions, and select public `SELF_CHECK`/`BOTH` guidance. Preserve
  `AND`/`OR`, thresholds, exceptions, `HARD_FAIL`, `SOFT_FAIL` and `WARNING`.
  A failure message alone is not a complete requirement. Never expose private
  conditions through a public execution-mode label; validate every dependency.
- FAQ: require fixed `_status = published` and `reviewStatus = approved` reads,
  paginate completely, convert Lexical content while preserving paragraph/list
  meaning and public links, and fingerprint the exact exported content.
  Current CMS documents are authoritative, not static seed fallback strings.

Use deterministic preparation for supported condition shapes. Mark unsupported
or ambiguous shapes as blocked for staff review; do not ask an AI to invent their
meaning. A reviewed explanation must reference its exact rule/version and be
included in the approval fingerprint. The bot explains published criteria and
links to the existing self-check; it does not evaluate a visitor's eligibility.
Fingerprint the complete resolved public projection, including referenced
condition trees and self-check definitions. A version ID alone is insufficient
when its dependencies can change; revalidation must detect those changes too.

Later `document-passage` or `programme-page` records add document revision,
page/section and extracted text to the same envelope. Their adapters, extraction
and approval interfaces are future work, not automatically enabled sources.

## 6. Resource activation and automatic synchronization

The application's existing publication workflow is the content approval.
The chatbot knowledge page lists eligible published resources and lets staff
control which ones the bot uses. Reuse the shared DataTable, Checkbox, ArrowLink
and Pagination components. Show resource name, type, Active/Inactive status and
Last updated from the source publication timestamp, not the activation time.
Use SQL pagination and total counts; show one server page at a time. Checked
rows can be activated or deactivated in bulk using separate action permissions.

Funding and Eligibility have independent activation flags. Eligibility always
uses the exact ruleset version bound to the funding call's published revision,
including still-bound retired versions; never use the call's working draft
binding. Only public SELF_CHECK/BOTH guidance is eligible. Public Contact
knowledge consists solely of the published programme email, telephone, address
and office hours. Visitor follow-up contact details remain private.

New resources are inactive by default. Migration preserves resources from an
existing active knowledge version. Repeating migrations preserves staff choices.
Changes to activation flags and their audit records commit atomically. Bounds
are enforced before activation commits. Deactivation can still be performed
when existing source content is invalid or exceeds export limits.

A background processor and the request-time refresh use the current activated,
published sources to regenerate immutable files automatically. They remove
unpublished/deleted resources and omit unsupported or conflicting passages.
Inactive source edits have no effect on the knowledge content. No second staff
approval or manual release publication is required.

Keep unique environment-prefixed files, verified checksums and pinned object
generations. Upload failures leave the old pointer intact and retry the same
automatically generated files. Final activation compares current source content
and the selection epoch inside a transaction. Concurrent synchronization reuses
the same generated version and prevents duplicate activation audit records.
Recheck current source content, activation flags and epoch before answering,
including in-flight responses and retried stored answers. Changed, deactivated
or unpublished content must not be served from a cached version.

## 7. Visitor answers and public data boundary

Request flow:

```text
Visitor question -> validate, rate-limit and screen
    -> resolve conversation/funding-call context
    -> verify active release and source availability
    -> retrieve approved relevant passages
    -> validate supported answer -> answer with source links
    -> otherwise create escalation and notify staff
```

Search ranks approved passages within the selected call and applicable global
content. If several calls could apply, ask a concise clarification rather than
merging their criteria. Define bounded defaults and derive representative test
questions from the existing public projections in CB0/CB4. Tune them against
staff acceptance examples as those become available. No relevant, sufficient or
consistent evidence means an unresolved outcome; a confident model assertion is
not evidence.

For the initial strict "KB only" boundary, the model may select approved answer
or passage IDs from the retrieved candidate set; the server validates those IDs
and renders the approved text. It must not return unverified free-form model
prose. Source links are resolved from approved metadata, not invented by the
model. Any later free-form paraphrasing needs its own acceptance decision because
prompting and citations alone cannot guarantee absence of unsupported claims.

The model receives only the screened question, minimal screened context needed
for that conversation and selected public passages. It receives no database or
storage credentials, arbitrary URLs/SQL, application/workflow tools, private
records, optional contact details or other conversations. Treat passages and
visitor text as data, not instructions. Bound message lengths, conversation
context, file sizes, candidate counts, model tokens, timeouts and request rates.

Implement the model adapter within the GCP integration direction discussed for
the feature. Finalize the concrete provider/model during that implementation,
using existing project configuration where applicable; this is not a blocker
for source preparation, review, retrieval or escalation development. Verify its
prompt logging, caching, request/response retention and stored-interaction
behavior before live use. Inspect outgoing payloads in tests. The agreed input
boundary is screened visitor text plus selected approved public passages, with
no private records or contact details. Screening reduces risk but cannot
guarantee arbitrary free text contains no sensitive information; record the
provider's actual behavior before sending real visitor text to it.
Keep that evidence in the deployment/gate record. It does not require a mandatory
environment JSON declaration or an automatic review-expiry rule. Runtime uses
the existing GCP project/credentials and ordinary model/location configuration;
staff control availability and AI answers through Chatbot Settings.

Model/storage/service outages return a clear unavailable response and create an
appropriately classified follow-up where possible. Do not call such an outage a
knowledge gap or tell the visitor staff were notified before an occurrence was
successfully queued. Notification delivery remains separately observable.

## 8. Conversations and automatic human follow-up

Before chat starts, disclose that unresolved conversations are retained and
shared with authorized support staff. Follow the agreed notice/consent policy.
Keep a bounded server-controlled conversation context so escalation can retain
history up to the unresolved turn; do not trust a browser-submitted transcript.
Non-escalated context expires promptly according to the configured session
policy. Ordinary logs exclude raw questions and transcripts.

Use an opaque conversation/session credential and verify its binding on every
public operation. Predictable IDs, route parameters and possession of a staff
link must not grant access. Do not expose a public transcript-download endpoint.

An unresolved turn must transactionally save:

- The protected escalation linked to its conversation and message.
- Screened conversation history, timestamps and the unresolved question.
- The reason: missing/insufficient/conflicting evidence or service failure.
- Release/source references used for that turn.
- Audit and notification occurrence/outbox records with idempotency identity.

Automatic escalation does not require the visitor to request follow-up. Prevent
duplicate cases and notifications for retried turns; subsequent unresolved turns
can update the existing open case according to the CB0 policy. Apply bounded
abuse controls without silently discarding legitimate unresolved questions.

Reuse the notification engine's recipient configuration, delivery processing,
retry and status. Notify only staff authorized to read the target case. The
message contains a case reference and authenticated staff link, not transcript
text or visitor contact details. Reading that link rechecks permission and case
assignment each time. A notification retry must not create a second case.

The staff workspace shows protected history and supports new, in-progress and
resolved states, assignment and a resolution note. Optional visitor contact
details use a separate validated form and are excluded from model requests.
Human follow-up uses the agreed support process; this is not live operator chat.
Staff resolutions never enter knowledge automatically.

Implement configurable retention, expiry, cleanup and access audit for
conversations, contact details and escalations. Document bounded implementation
defaults and verify the operational settings before public activation; waiting
for those final settings must not block development of the protected workflow.
Keep transcripts out of knowledge artifacts, search indexes, notification bodies
and monthly aggregates. Deletion/expiry also invalidates transcript caches.

## 9. Delivery phases and acceptance gates

Every gate begins pending. Automated evidence does not replace written
acceptance. Record each phase's evidence and outstanding limits in a focused
`docs/Chatbot_CB<n>_Implementation_Gate.md` when that phase is implemented.

| Phase | Deliverable | Required evidence before acceptance |
| --- | --- | --- |
| CB0: implementation contracts | Carry forward the agreed sources/storage/preview/escalation model; define projections, permissions, schemas, routes, tested limits and configurable retention/recipient policies | Code-backed contracts and recorded implementation defaults; operational configuration tracked separately without requiring named staff, a manually supplied source list or live cloud provisioning to start |
| CB1: source preparation and persistence | Repeatable migrations, source-owned projected queries, exact snapshot bindings, FAQ pagination/conversion, deterministic eligibility explanations and prepared snapshots | Repository/SQL projection tests; more than 50 FAQs; multiple call/version fixtures; draft/private exclusion; logical grouping, failure severity, unsupported condition and retired-bound-version tests |
| CB2: resource administration | Server-paginated published resource table, ArrowLink names, types, activation status, Last updated and bulk activation/deactivation | UI/route/policy and SQL projection/pagination tests; permission denial; atomic bulk/audit tests; automatic updates and deactivation during in-flight responses |
| CB3: storage and release lifecycle | Configured private bucket with a release-scoped knowledge namespace, unique artifacts, upload verification, transactional activation, source-change jobs, revocation and cache invalidation | Storage adapter and activation tests; partial failure/retry/concurrent publish; checksum failure; stale source, cross-instance cache and in-flight withdrawal tests |
| CB4: retrieval and model boundary | Bounded file search, call context, source-backed selection/rendering, rate limits/screening and provider adapter | Approved answer corpus; unsupported/conflicting/ambiguous queries; invalid model IDs, injected text, invented citation and outgoing-payload inspection; provider privacy settings recorded before runtime use |
| CB5: escalation and staff follow-up | Protected server-controlled conversations, automatic case creation, configured notification event and protected staff history/state | Atomic case/audit/occurrence tests; deduplication; allowed/denied/assignment mismatch; cross-conversation access; recipient authorization; retention and notification retry tests |
| CB6: visitor integration and operational acceptance | Public widget, notice, links, optional contact form, end-to-end flows and handover guidance | Available-browser accessibility/responsive checks; known question -> cited answer; unknown question -> case -> actual notification -> authorized history -> resolution; live GCP/provider verification and written stakeholder acceptance |

Implement independently reviewable phases. Do not start unrelated ingestion or
reporting delivery work to fill a phase. Resolve routine technical choices during
the relevant phase and document the defaults. Continue through local/focused
implementation with test adapters where live credentials or resources are not
yet configured. Missing live configuration limits the corresponding runtime
verification or public activation, not the rest of implementation.

## 10. Validation and deployment evidence

For each implementation phase, run the relevant focused tests plus:

```text
npm run check:architecture
npm run check:files
npm run lint
npm run typecheck
```

Use meaningful unit/integration tests for policies, validation, services,
repositories and protected routes. Query tests cover projection shape, filtering,
ordering, pagination boundaries and authorization scope. Prefer set-based SQL or
bounded batches; run independent reads concurrently and avoid N+1 queries.
Every source read selects only needed fields. Keep source extraction pagination
distinct from bounded in-memory search of the already approved knowledge corpus.

Do not run `npm run check` as a shortcut: it includes a production build.
Production builds require an explicit request. Do not install browsers or browser
system dependencies without an explicit request. If browser verification is
blocked, document the limitation and continue focused/static/database checks.
Use sequential bounded verification processes when machine resources require it.

Gate records must separate static/focused tests, migration/database evidence,
browser evidence, GCP artifact/provider/notification runtime evidence and written
production acceptance. Migration files, local tests and queued notifications do
not establish a deployed migration, live chatbot or delivered staff notification.

Before live activation, verify the bucket/environment, exact model privacy
configuration, active published resources, support recipients/permissions, retention
settings, worker execution/recovery, and public/staff acceptance flows. These
checks establish live readiness; they are not prerequisites for starting CB1.

## 11. Settled decisions, implementation details and live configuration

### 11.1 Settled design: implement without asking again

- Initial source types: published funding calls, their exact bound public
  eligibility guidance, approved published FAQs and public programme contact details.
- A resource table with linked names, source types, activation status, Last updated and bulk actions; existing application publication is sufficient.
- Private GCP Cloud Storage artifacts under
  `<environment>/chatbot-knowledge-base/releases/<release-id>/`.
- PostgreSQL source/approval/release metadata and protected escalation history.
- Approved-knowledge-only answers with source links; screened model inputs and
  exclusion of private application data and optional contact details.
- Automatic unresolved-case creation and staff notification with a protected
  conversation-history link, using the existing notification engine.
- Visitor disclosure, protected access, retention/cleanup support and no raw
  transcript content in ordinary logs.
- Extensible record contract; additional source ingestion remains later work.

### 11.2 Resolve as part of implementation

| Item previously listed as outstanding | Implementation treatment |
| --- | --- |
| Named owner/approver and support staff | Implement permission-based access and recipient/assignment configuration; real staff names do not block the schema, policies or screens |
| Initial calls/FAQs and expected passages | List existing eligible published resources; staff activate them in the resource table; published changes synchronize automatically |
| Model/provider | Build the provider boundary and finalize the concrete GCP model integration during CB4; the agreed public-only input boundary is already established |
| KB bucket/project and identities | Reuse the existing private bucket and GCP/environment conventions, with an optional KB bucket override; use storage test adapters for local checks until live configuration is available |
| Retention, notice and cleanup | Implement the agreed disclosure/access controls and configurable cleanup with documented defaults; verify final operational retention settings before public use |
| Assignment, destination and follow-up | Implement case assignment/state and existing notification configuration; actual recipients are operational settings, not prerequisites for building escalation |
| Search/request/file/model limits and retries | Choose bounded defaults, test them and record them in the relevant phase; reuse existing notification retry behavior rather than requesting another design agreement |

### 11.3 Checks required only for the affected live operation

- Live artifact publication needs the configured private KB bucket and verified
  read/write access.
- Live model calls need valid provider configuration and verified data handling.
- Live staff delivery needs configured recipients with case access and a verified
  channel; public activation must demonstrate that unresolved cases reach staff.
- Public activation needs verified files from active published resources, effective notice and
  retention settings, working cleanup and the acceptance flows in CB6.

No item in this section is a blanket blocker for starting or continuing local
implementation. If a particular external setting is missing, record the exact
live check that remains unverified and continue all unaffected phase work.
