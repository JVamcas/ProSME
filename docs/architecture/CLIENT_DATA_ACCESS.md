# Client and server data-access contract

## Status

This contract applies to every feature in the public site, applicant portal,
authentication experience, and operations interface. It complements
[`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) without changing its approved
top-level directories or route ownership.

Payload's `/cms` application is excluded. Payload keeps its own data-loading
mechanisms and must not be wrapped in the platform TanStack Query provider.

## Client-side flow

Client components obtain server state through a feature hook:

```text
Client component
    → TanStack Query hook
    → domain client service
    → Next.js API route
    → domain application service
    → repository or integration adapter
    → database or external system
```

Client components must not call `fetch` directly. They must not import the
database client, repositories, server-only services, Firebase Admin, or Payload
server APIs.

Feature query keys and cache invalidation belong with the feature hook. HTTP
request construction and response translation belong in the domain client
service.

## Server-side flow

API route handlers are transport adapters. A route handler may:

- parse and validate request input;
- resolve the authenticated application user;
- invoke an application service;
- translate domain failures to HTTP responses.

Route handlers must not implement workflows or query feature tables directly.
The health endpoint may issue a minimal database probe because checking the
database connection is its explicit infrastructure responsibility.

Application services enforce authorization and business rules. Repositories
own PostgreSQL access, while integration adapters own communication with
systems such as Payload and Firebase.

Server Components may call a server-side application query or service directly
when browser caching, polling, or interactive refetching is unnecessary. They
must still avoid direct database access and must enforce authorization for
protected operations.

## Route-group providers

The shared `QueryProvider` wraps these route groups:

- public;
- authentication;
- applicant portal;
- staff operations.

The Payload route group is intentionally separate.

## Enforcement

Run the boundary gate with:

```bash
npm run check:architecture
```

The root `npm run check` command and continuous-integration workflow include
this gate. It rejects direct client requests, browser-to-server imports,
route-to-repository imports, direct database access from backend services, and
repositories that are not marked server-only.

## Applications example

```text
ApplicationsTable
    → useApplications
    → ClientApplicationService.getAll
    → GET /api/admin/applications
    → ServerApplicationService.getApplications
    → findAllApplications
```

The current operations screens are a read-only prototype and their repository
is fixture-backed. Phase 3 replaces that repository implementation with the
PostgreSQL application repository while preserving the client hook, service,
API, and application-service boundaries.

The `/api/admin/applications` endpoint performs its own server-side capability
check.
The `/admin` layout check and client-side visibility are usability safeguards,
not substitutes for endpoint authorization.
