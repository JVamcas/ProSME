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

| File kind                                          | Maximum lines |
| -------------------------------------------------- | ------------: |
| Next.js `page.tsx`, `layout.tsx`, `route.ts`       |           150 |
| React component or hook                            |           200 |
| Domain service, repository, policy, or integration |           250 |
| Other handwritten TypeScript/JavaScript            |           200 |
| Individual function or method                      |            60 |
| Test file                                          |           300 |

- These are hard limits, not targets. Split a file before it crosses its limit.
- A page or route should normally be substantially shorter than its maximum.
- Do not evade limits by compressing code, placing several statements on one line, or embedding large data objects in implementation files.
- Generated files, lockfiles, generated migrations, imported source material, and generated Payload types/import maps are exempt.
- Configuration or documentation that genuinely cannot be split must include a short justification in the relevant gate record.

### Readable source formatting is mandatory

- Maintainability takes precedence over minimizing line count. Never compress
  implementation code to stay below a file-size limit; split responsibilities
  into focused files instead.
- Do not write pages, components, functions, JSX trees, object literals, or
  control flow as dense single-line expressions when they contain nested
  structure or multiple concerns.
- Use one statement per line. Format nested JSX, conditional rendering, mapped
  content, long prop lists, and chained operations across clear, readable lines.
- Prefer named variables, focused functions, and extracted components over
  deeply nested ternaries or substantial inline logic.
- When modifying an existing compressed component or function, reformat the
  complete affected component or function into readable multiline source as
  part of the change. Do not perpetuate unreadable formatting in touched code.
- A file can fail review for unreadable or artificially compressed source even
  when lint, type checking, tests, and the production build pass.

## 3. Components and reuse

- Search the repository before creating a component, hook, helper, schema, type, or constant.
- Reuse or extend an existing implementation when its responsibility matches.
- Put reusable, domain-neutral primitives in `src/components/ui`.
- Put reusable layouts and navigation in `src/components/layout`.
- Put applicant feature components under `src/components/applicant/<domain>`.
- Put administrative feature components under `src/components/admin/<domain>`.
- Put unauthenticated website components under `src/components/public`, and
  do not use generic feature folders that hide whether a component belongs to
  the applicant, admin, or public surface.
- Component filenames must clearly describe their responsibility within the
  owning audience/domain path; hook filenames begin with `use`.
- Repeated UI appearing twice must be evaluated for extraction. Repeated UI appearing three times must be extracted unless the structures have materially different behavior.
- Do not create duplicate buttons, inputs, cards, dialogs, tables, status badges, loaders, empty states, or form-field wrappers.
- Prefer composition and variants over copying and editing an existing component.
- Shared formatting, parsing, and validation belongs in focused utilities or schemas, not inside page components.
- Every handwritten application form outside Payload must use React Hook Form with a Zod schema through `zodResolver`.
- Do not manage form field values with ad hoc `useState`, manually parse `FormData`, or duplicate schema validation inside submit handlers.

## 4. Pages, routes, and modules

- Pages compose views and invoke use cases. They must not contain database, workflow, or authorization logic.
- Maintain this dependency flow for client-side server state: client component → TanStack Query hook → frontend client service → Next.js API route → backend domain service → repository or integration adapter → database or external system.
- Client components must not call `fetch` directly. They use `useQuery` or `useMutation` through a domain hook. Hooks own query keys, caching, invalidation, and mutation state.
- Frontend client services own HTTP requests and response parsing. Name the
  flattened domain service `Client<Domain>Service.ts`; it must not import
  server-only modules, repositories, the database, Firebase Admin, or Payload
  server APIs.
- Route handlers validate transport input, resolve request context, invoke a backend service/command/query, and translate the result to HTTP. They must not implement domain workflows or import repositories/database code directly.
- Business behavior belongs under `src/modules/<domain>` using the documented module convention.
- Backend services are named `Server<Domain>Service.ts`. They enforce
  authorization and business rules and coordinate transactions, workflow,
  audit, and integrations. They may call repositories but must not query the
  database client/schema directly.
- Application lifecycle states such as draft, ready to submit, submitted, and
  under review are data states. Never create state-specific service, module,
  repository, or component families.
- PostgreSQL access belongs in `src/db/repositories` or a domain repository file. Repositories are the only feature layer allowed to query application tables.
- Server Components may call a backend service/query directly when browser caching or interactive refetching is unnecessary. They must never access repositories or the database directly.
- The health route may execute a minimal direct database probe because database connectivity is its explicit infrastructure responsibility.
- Every protected server operation must perform server-side capability checks.
- Client-side visibility checks are usability enhancements only and never authorization controls.
- Multi-record writes must use a transaction and create required workflow/audit records atomically.
- Run the architecture boundary gate before reporting changes complete. Do not bypass it with dynamic imports, re-export indirection, or renamed files.

## 5. Firebase and Payload boundaries

- Browser Firebase access belongs in the frontend authentication client service. React components and hooks must not call Firebase directly.
- Browser Firebase imports may use only the client/config/error modules intended for browser use.
- Firebase Admin code must be server-only and must never enter a client bundle.
- Use real Firebase projects; do not add Firebase Emulator configuration.
- Payload local username/password authentication must remain disabled.
- `CmsPrincipals` is a minimal mirror of an authorized PostgreSQL application user and contains no password.
- Payload collection tables use the `cms_` prefix. Application tables use the `app_` prefix.
- Payload's internal `/cms` data loading is excluded from the TanStack Query/client-service flow. Do not wrap the Payload route group in the platform Query provider or rewrite Payload internals to use platform API routes.

## 6. Quality and change discipline

- Use exact dependency versions and commit the lockfile.
- Do not commit secrets, service-account files, real applicant data, or production exports.
- Every database change requires a repeatable migration.
- Add or update tests for changed policies, validation, services, repositories, and protected routes.
- Before reporting work complete, run lint, type checking, tests, and the production build.
- Do not report a gate as passed without its required evidence and written acceptance.
- Preserve unrelated user changes and source documents.
