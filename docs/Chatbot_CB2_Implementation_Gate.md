# Chatbot CB2 readable review and exact-content approval

Owner revision (October 10, 2026): the manual knowledge preview/approval/publication
flow below is historical evidence. Application publication is sufficient; current
behavior is the resource table and automatic synchronization documented in
[the resource activation gate](Chatbot_Resource_Activation_Implementation_Gate.md).

Date: 2026-10-10. Implementation delivered; acceptance pending content-owner review.

## Implementation

[Staff workspace](../apps/platform/src/modules/chatbot/ui/operations/ChatbotKnowledgeWorkspace.tsx)
at `/admin/chatbot/knowledge` uses the existing authenticated operations shell and
permission-filtered navigation. The selection form uses React Hook Form,
`zodResolver`, shared `FormField` and `FormMultiSelect`, including paginated choices.

[Readable preview](../apps/platform/src/modules/chatbot/ui/operations/KnowledgeReleasePreview.tsx)
shows call descriptions, exact amounts, dates and public contacts; logically grouped
eligibility with mandatory/review/advisory distinctions; FAQ questions/answers;
public source/version links; allowlisted facts; inline issues; and additions,
changed passages and removals against the active release. JSON is not the primary UI.

Approval requires both knowledge read and the distinct approval permission.
The protected service locks the release, verifies the submitted hash against the
stored immutable snapshot, rejects issues, and reconstructs the public source
fingerprints while holding dependency locks. Changed or unavailable sources return
HTTP conflict; the user must prepare and review a new snapshot.
Approval/audit/status writes are atomic. Repeated concurrent approvals create one
approval and one audit; immutable content is reused, not reread for replacement export.

The UI distinguishes approval from publication: approved content awaits publication.
Artifact upload, verification and activation remain CB3. No active pointer is changed.

Existing button, empty-state, field-wrapper and form-binding implementations now
live in `shared/ui`; transitional exports preserve unrelated consumers.

## Component reuse enforcement

[AST gate](../scripts/development/check-component-reuse.mjs) is part of
`npm run check:architecture`. It rejects hardwired native buttons, inputs,
selects, textareas, labels, tables and dialogs outside their existing shared owners,
explicit copied dialog roles, and duplicate exported component names.
Importing an existing component does not exempt a hardwired replacement.

Local checks include new/changed TSX and always scan chatbot UI. CI also compares
against the pull-request base or push predecessor through `COMPONENT_REUSE_BASE`.
The workflow fetches commit history and runs the gate's negative/positive fixtures.
`npm run test:component-reuse` runs those fixtures independently.

This is a deterministic control and naming check. It cannot prove that differently
named arbitrary JSX or CSS has the same responsibility; semantic duplication still
requires review. Unchanged legacy UI is intentionally not migrated in this feature.

## Validation

- Focused chatbot checks: **59 tests across 11 files**, including real PostgreSQL,
  authenticated success/denial routes, assignment policy, source selection and
  preview DOM behavior. Run with `CHATBOT_TEST_DATABASE_URL` to include PostgreSQL;
  without it the six database tests are explicitly skipped.
- Component-reuse negative/positive fixtures: passed.
- `npm run check:architecture`: passed, including form and component reuse checks.
- `npm run check:files`: passed.
- `npm run lint`: passed with 24 existing warnings and no errors.
- `NODE_OPTIONS=--max-old-space-size=3072 npm run typecheck`: passed.
- Related regression run: 42/44 tests passed across portal access/navigation,
  shared form controls and CMS buttons. Two applicant-navigation assertions expect
  old labels/order. The applicant navigation section is byte-identical to `HEAD`,
  so those existing failures were preserved rather than changing unrelated behavior.

No production build, browser installation, application-database migration or
deployment was performed. UI evidence uses DOM tests, not a running-browser
responsive/accessibility acceptance check. PostgreSQL ran in a disposable local
container with isolated synthetic fixture data; no real staff/applicant data was used.

## Content-owner acceptance

After migration and grants, the content owner must select representative actual
calls/FAQs and confirm comprehension of descriptions, amounts/dates, AND/OR groups,
exceptions, severity, FAQ text, source references and the displayed changes.
Reviewers must confirm they understand exactly what approving the preview binds.
Record their written acceptance here; automated checks do not replace it.

Written CB2/content-owner acceptance: **pending**.
