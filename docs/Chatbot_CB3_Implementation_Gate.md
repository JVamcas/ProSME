# CB3 implementation evidence

Owner revision (October 10, 2026): the manual knowledge preview/approval/publication
flow below is historical evidence. Application publication is sufficient; current
behavior is the resource table and automatic synchronization documented in
[the resource activation gate](Chatbot_Resource_Activation_Implementation_Gate.md).

Status: implemented; written acceptance and live storage verification pending.

The owning chatbot module uploads immutable release-specific `knowledge.json` and
`manifest.json` from the saved approved snapshot. Storage uses the existing
`GCS_DOCUMENTS_BUCKET` by default. `GCS_CHATBOT_KNOWLEDGE_BUCKET` is an optional
override; unset or blank uses the existing bucket, while a nonblank invalid
override is rejected. The override may name the same bucket. The adapter accepts
only the release's exact knowledge/manifest keys and never enumerates or retrieves
applicant objects. Preparation checks the
serialized approved-artifact envelope as well as snapshot size. Paths use the
existing deployment-environment prefix. Conditional writes require generation
zero; retries adopt only byte-identical existing objects. Downloads pin object
generation, validate CRC32C, bound size to 5 MiB, and compare SHA-256, length,
manifest bindings and exact approved content. Artifacts contain public projections
only. Upload failure leaves approval intact and the database pointer unchanged.

Publication accepts the exact content hash and expected database epoch. After
upload verification, source locks/revalidation precede the state lock. Artifact
registration, pointer activation and audit commit atomically. Replays of the same
active release are idempotent; competing releases cannot overwrite a changed
epoch. Withdrawal permanently revokes the release, clears an active pointer and
advances the epoch. Database guards also reject activation without approval,
verified artifacts or after revocation.

Migration `0189_chatbot_release_lifecycle.sql` adds artifacts, revocations,
epochs and the transactional source outbox. Statement triggers capture funding
publication/lifecycle, CMS FAQ changes/deletion and mutable eligibility dependency
writes in their source transaction. This provides the funding-publication outbox
pattern directly at persistence, while also covering CMS hooks and bypassed hook
writes. Capture is conservative: unrelated source writes may invalidate a cache.
Jobs store source table/epoch/release references, never source text. Authenticated
`POST /api/internal/chatbot/process` prepares a replacement candidate and performs
retention cleanup. It processes one pending job per invocation and reconciles the
current public projections even when no job exists. Schedule it repeatedly;
backlog is observable in `app_chatbot_source_jobs`. Replacement candidates retain
the selecting owner's identity, with `PREPARED_FROM_SOURCE_CHANGE` audit action
and job linkage; this does not represent human approval.

The runtime maintains at most one verified release per instance. Every load
rechecks authoritative public projections and the database pointer/epoch. Every
completed response repeats source/pointer validation inside its persistence
transaction, including responses returned after model latency. Stale or
unverifiable sources fail closed. The initial implementation conservatively
blocks the whole release when a selected source changes. Final response validation
is the transaction's authorization point; source changes committed afterward
cannot retract bytes already delivered to a browser.

Automated evidence: GCS adapter tests inspect conditional-write options, pinned
CRC32C reads, bucket selection, corrupt/oversized objects and foreign keys. Real
isolated PostgreSQL tests apply migrations twice; verify partial upload/retry,
concurrent publishers, activation audit rollback, stale source rejection,
replacement deduplication, rolled-back source writes, deletion, missed-job
reconciliation, two instance caches and old in-flight leases. Conversation tests
also withdraw knowledge during model selection and verify no stale passage is
returned. See `ReleaseLifecyclePostgres.test.ts`, `ChatbotStorageAdapter.test.ts`
and `ChatbotArtifactVerification.test.ts`.

Live acceptance still requires a private configured bucket, appropriate IAM,
object lifecycle/retention settings, processor scheduling, actual cloud upload
verification, deployed cross-instance behavior and written owner acceptance.
No application database migration, deployment or production build was performed.

Validation recorded on October 10, 2026: the combined chatbot/notification suite
passed 293 tests in 49 files. Subsequent focused checks passed the two added
PostgreSQL queue tests and the updated provider/UI/navigation checks, bringing
chatbot/notification coverage to 296 distinct tests, including 27 PostgreSQL tests.
Three existing sidebar tests also passed. Migrations were repeated only in an
isolated synthetic database. Full platform type checking, architecture/form
boundaries, component reuse, file limits and the reuse guard's regression test
passed. Written and live acceptance remain pending as described above.
Full platform lint passed with zero errors and 24 existing warnings. Both staged
and working-tree whitespace checks passed. No production build or live browser
verification was run; the disposable PostgreSQL container was removed afterward.

Shared-bucket change (October 10, 2026): per the owner's instruction, the existing
private application bucket is now the default, and a separate bucket is optional.
All 107 chatbot unit tests in 18 files passed, including blank/unset override,
explicit shared/separate bucket, invalid override, missing configuration,
release-scoped uploads, pinned/checksummed reads and unrelated object-path rejection.
Architecture/form/reuse boundaries, file-size checks and full platform type
checking passed. No database migration or new bucket provisioning is required.
No live cloud configuration change or deployment was performed.
