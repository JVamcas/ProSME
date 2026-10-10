# CB4 implementation evidence

Status: implemented; content-owner corpus approval and live provider acceptance pending.

Retrieval searches only the bounded verified public knowledge artifact: at most
5,000 records, ranked deterministically by title/text token overlap, at most 12
candidates and 32,000 candidate characters. Call selection narrows to the selected
call and global FAQs. Multiple plausible call scopes prompt a clarification.
Unsupported questions never invoke the model. Context uses only the conversation's
screened server-owned visitor messages (last four), with no submitted transcript,
contact details or other conversations. Selected call context uses the approved
public call title, never visitor-supplied call metadata. Source changes are checked before search
and again before completing a turn.

Question input is bounded to 2,000 characters. Screening normalizes text, removes
contact/credential-like content and detects instruction-like input; poisoned
passages are excluded. This reduces disclosure risk but does not prove arbitrary
free text contains no sensitive information. Context is bounded to 20 retained
messages for runtime use; provider context uses only the last four visitor turns.
Conversation storage is capped at 30 completed turns. PostgreSQL enforces shared
rate windows: 10 requests/minute/conversation, 30 session creations/minute/network
identity and 100 answer attempts/minute globally. Without explicit trusted-proxy
configuration session creation uses a shared public cap. With a trusted proxy,
`x-real-ip` must be overwritten by that proxy and `CHATBOT_NETWORK_HASH_SECRET`
must have at least 32 characters; raw addresses are never persisted.

The provider can return only `{status, passageIds}`. At most three distinct IDs
must belong to the retrieved candidates. Invalid IDs, extra text, invented URLs
or citations, malformed responses and provider failures become service failures.
Insufficient/conflicting responses preserve those evidence classifications. The
server renders the exact approved passage text and links, bounded to 20,000 answer
characters. It exposes no tools, SQL, arbitrary fetches, file URIs or free-form
model answer prose. Output budget is 512 tokens and selection timeout 15 seconds;
the HTTP adapter also bounds responses and disables retries.

The concrete adapter uses Vertex `generateContent` with Gemini `gemini-3.8-flash`,
LOW thinking and structured JSON. Configuration accepts only this model and
`eu`, `us` or `global`; it accepts no arbitrary model/endpoint from a visitor.
Google documents these locations and LOW thinking support in the
[model contract](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash).
Gemini 2.5 Flash was deliberately not selected because its documented retirement
is October 20, 2026.

Runtime default: AI answers are off in PostgreSQL and managed through **Chatbot
> Settings**. Environment switches no longer control availability or AI answers.
Provider configuration reuses `GOOGLE_CLOUD_PROJECT` and the existing GCP
credential resolver, including its service-account project fallback. The model
defaults to `gemini-3.8-flash` and location to `global`; `CHATBOT_MODEL` and
`CHATBOT_MODEL_LOCATION` can record explicit configuration. Unsupported model
IDs, locations and unsafe project IDs are rejected. Enabling AI requires valid
connection configuration. There is no mandatory privacy JSON, attestation form
or time-based review expiry.

Privacy settings remain operational deployment evidence in this gate record.
No live cloud privacy settings have been verified by this change. Record actual
request/response logging, abuse-monitoring applicability and project caching
settings alongside deployment evidence before using real visitor data. The
adapter uses neither the Interactions API nor explicit caches/grounding; that
code behavior does not independently establish provider-side retention settings.
Google's [retention guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention)
requires checking abuse-monitoring applicability, request/response logging and
project caching; advanced model conditions also require verification.

Automated evidence: synthetic prepared public answer corpus covers documents,
amounts, dates and employee eligibility. Tests cover unrelated/unsupported,
conflicting/insufficient and ambiguous questions, scope filtering, candidate bounds,
injected visitor/source text, unknown/duplicate IDs, invented prose/citations,
invalid model/connection settings and outgoing payload inspection.
The corpus is repository evidence, not a content owner's written acceptance or
an evaluation of live Gemini accuracy. No real visitor text was sent to a provider.

Final automated validation is recorded in `Chatbot_CB3_Implementation_Gate.md`.

Provider configuration simplification (October 10, 2026): the mandatory privacy
JSON and 90-day review expiry were removed following owner feedback. Existing
project/credential resolution, supported model/location validation, application
switches and the screened public-only payload boundary remain in place. All 106
chatbot unit tests and six settings PostgreSQL integration tests passed. The
integration tests used an isolated synthetic database, removed after validation.
Full platform type checking, architecture/form/component reuse gates, file-size
checks and whitespace checks passed. Lint passed with zero errors and 24 existing
warnings. No live provider call, cloud configuration change or deployment was
performed; live privacy evidence and written acceptance remain pending.
