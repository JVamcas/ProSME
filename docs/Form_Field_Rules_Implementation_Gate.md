# Form field rules implementation record

Date: 2026-10-13

## Implemented scope

The field rules dialog exposes validation conditions, custom error messages,
draft/submission applicability, missing-input policy, visibility, conditional
editability and conditional requirement. It uses React Hook Form/Zod and the
existing shared condition editor and controls. Numeric calculations were not
part of this validation change.

Rules reuse the canonical condition evaluator. Static required flags remain
required; conditional requirements add requirements. Invalid conditions reject
validation rather than being treated as missing inputs. Missing validation
inputs can defer during drafts or reject, according to configuration. Editable
and required conditions reference earlier fields; validation can reference the
current field and other fields.

Rules are persisted, copied and projected with immutable form versions through
migration `0204_form_field_rules.sql`. Existing published versions and pinned
applications are not rewritten. Document limits and allowed types use migrations
0202 and 0203 respectively.

The renderer applies editability and requirement behavior and reports validation
messages. Server response saves/completion, application saves/readiness, document
uploads and requested-information corrections enforce authoritative rules.
Locked fields cannot be changed; omitted locked answers retain their prior value.
Scoped prior responses and row versions protect updates. Requested-information
corrections evaluate the full pinned form context on the server.

The application form service moved into the application's owning application
layer. Condition editing is shared between section visibility and field rules.

## Local verification

- Full forms, applications and application-document suite: 91 files, 389 tests
  passed, including rule behavior, protected saves/uploads, persistence,
  readiness, document formats and PDF page limits.
- After the final shared-control and renderer refactoring: five focused UI test
  files, 29 tests passed.
- Focused ESLint on changed source/test files passed.
- Platform TypeScript checking passed.
- Architecture, form-boundary and component-reuse gates passed.
- Changed-file AST checks passed for 61 source/test files against the required
  600-line implementation, 400-line test and 200-line function limits.
- Working-tree and staged whitespace checks passed.
- The earlier attachment projection fixture mismatch was corrected to match its
  existing query projection; the full suite above includes that passing test.

## Acceptance boundary

This records local implementation and automated verification only. No GCP
changes, migration execution, deployment, production build or browser acceptance
were performed. Migration and deployment remain pending. Business Profile and
Pitch Deck must be configured as 12-page and 5-page PDF fields respectively in
the relevant draft, then published through the existing versioning flow.
