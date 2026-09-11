# Repository Rules

These instructions apply to the entire repository. They are mandatory for human contributors and coding agents.

## 1. Architecture is fixed

- Follow [`docs/architecture/PROJECT_STRUCTURE.md`](docs/architecture/PROJECT_STRUCTURE.md).
- The product is one deployable Next.js application at `apps/platform`.
- Payload CMS is embedded in that application. Do not create separate web, API, or CMS applications.
- Do not rename, relocate, or add top-level architectural boundaries without first updating the architecture document and obtaining approval.
- Preserve route ownership: public `(public)`, authentication `(auth)`, applicant `(portal)`, staff `(operations)`, Payload `(payload)`, and explicit APIs under `app/api`.
- Firebase owns authentication. PostgreSQL owns application users, roles, and capabilities. Payload must not own platform credentials or authorization policy.

## 2. Strict file-size limits

Handwritten implementation files must stay within these limits:

| File kind | Maximum lines |
| --- | ---: |
| Next.js `page.tsx`, `layout.tsx`, `route.ts` | 150 |
| React component or hook | 200 |
| Domain service, repository, policy, or integration | 250 |
| Other handwritten TypeScript/JavaScript | 200 |
| Individual function or method | 60 |
| Test file | 300 |

- These are hard limits, not targets. Split a file before it crosses its limit.
- A page or route should normally be substantially shorter than its maximum.
- Do not evade limits by compressing code, placing several statements on one line, or embedding large data objects in implementation files.
- Generated files, lockfiles, generated migrations, imported source material, and generated Payload types/import maps are exempt.
- Configuration or documentation that genuinely cannot be split must include a short justification in the relevant gate record.

## 3. Components and reuse

- Search the repository before creating a component, hook, helper, schema, type, or constant.
- Reuse or extend an existing implementation when its responsibility matches.
- Put reusable, domain-neutral primitives in `src/components/ui`.
- Put reusable layouts and navigation in `src/components/layout`.
- Put feature-specific components with their owning feature area; do not turn `components/ui` into a feature dump.
- Repeated UI appearing twice must be evaluated for extraction. Repeated UI appearing three times must be extracted unless the structures have materially different behavior.
- Do not create duplicate buttons, inputs, cards, dialogs, tables, status badges, loaders, empty states, or form-field wrappers.
- Prefer composition and variants over copying and editing an existing component.
- Shared formatting, parsing, and validation belongs in focused utilities or schemas, not inside page components.

## 4. Pages, routes, and modules

- Pages compose views and invoke use cases. They must not contain database, workflow, or authorization logic.
- Route handlers validate transport input, invoke a service/command/query, and translate the result to HTTP. They must not implement domain workflows.
- Business behavior belongs under `src/modules/<domain>` using the documented module convention.
- PostgreSQL access belongs in `src/db/repositories` or a domain repository file. React components must never query the database directly.
- Every protected server operation must perform server-side capability checks.
- Client-side visibility checks are usability enhancements only and never authorization controls.
- Multi-record writes must use a transaction and create required workflow/audit records atomically.

## 5. Firebase and Payload boundaries

- Browser Firebase imports may use only the client/config/error modules intended for browser use.
- Firebase Admin code must be server-only and must never enter a client bundle.
- Use real Firebase projects; do not add Firebase Emulator configuration.
- Payload local username/password authentication must remain disabled.
- `CmsPrincipals` is a minimal mirror of an authorized PostgreSQL application user and contains no password.
- Payload collection tables use the `cms_` prefix. Application tables use the `app_` prefix.

## 6. Quality and change discipline

- Use exact dependency versions and commit the lockfile.
- Do not commit secrets, service-account files, real applicant data, or production exports.
- Every database change requires a repeatable migration.
- Add or update tests for changed policies, validation, services, repositories, and protected routes.
- Before reporting work complete, run lint, type checking, tests, and the production build.
- Do not report a gate as passed without its required evidence and written acceptance.
- Preserve unrelated user changes and source documents.
