# SME Fund Platform — Approved Project Structure

## Status

This is the approved repository and file structure for production implementation of Option B. It is normative: implementation and gate reviews must use it as the structural source of truth.

## Architecture decision

The repository contains one deployable Next.js application at `apps/platform`. Payload CMS runs inside the same Next.js runtime. Firebase Authentication and the application domain remain independent of Payload.

Client and server data access must follow the layered contract in
[`CLIENT_DATA_ACCESS.md`](./CLIENT_DATA_ACCESS.md). The contract applies across
the platform application and explicitly excludes Payload's internal `/cms`
data-loading implementation.

Phase 3 applicant and workflow implementation must also follow the accepted
contracts in [`../phase-3/`](../phase-3/), including the shared portal,
capability, workflow, SQL-projection, and API boundaries.

The former `apps/option-b` becomes `apps/platform`. Options A and C are retained under `archive/design-concepts` as M2 evidence and are excluded from active builds.

## Repository structure

```text
NPIDsme_Funding/
├── apps/
│   └── platform/
│       ├── src/
│       │   ├── app/                       # Next.js routes
│       │   ├── auth/                      # Firebase authentication and authorization
│       │   ├── db/                        # Application PostgreSQL schema
│       │   ├── modules/                   # Business and domain logic
│       │   ├── payload/                   # Payload CMS implementation
│       │   ├── components/                # Shared React components
│       │   ├── integrations/              # Email, AI, storage, analytics
│       │   ├── jobs/                      # Background tasks
│       │   ├── lib/                       # Cross-cutting utilities
│       │   ├── payload.config.ts
│       │   └── payload-types.ts
│       ├── public/
│       │   ├── brand/
│       │   ├── images/
│       │   └── documents/
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   ├── access-control/
│       │   └── e2e/
│       ├── drizzle/                       # Application migrations
│       ├── drizzle.config.ts
│       ├── next.config.mjs
│       ├── package.json
│       ├── Dockerfile
│       └── tsconfig.json
├── docs/
│   ├── source-material/
│   ├── architecture/
│   ├── testing/
│   ├── training/
│   ├── handover/
│   └── support/
├── infrastructure/
│   ├── local/
│   └── gcp/
├── scripts/
│   ├── development/
│   ├── migrations/
│   ├── seed/
│   └── deployment/
├── archive/
│   └── design-concepts/
│       ├── option-a/
│       └── option-c/
├── .env.example
├── package.json
└── README.md
```

## Next.js route structure

```text
src/app/
├── (public)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── about/page.tsx
│   ├── funding/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── eligibility/page.tsx
│   ├── how-to-apply/page.tsx
│   ├── news/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── resources/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── events/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── faq/page.tsx
│   ├── contact/page.tsx
│   ├── privacy/page.tsx
│   └── terms/page.tsx
├── (auth)/
│   ├── layout.tsx
│   ├── sign-in/page.tsx
│   ├── register/page.tsx
│   ├── verify-email/page.tsx
│   ├── forgot-password/page.tsx
│   └── unauthorized/page.tsx
├── (portal)/
│   └── portal/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── profile/page.tsx
│       ├── business/page.tsx          # Legacy redirect
│       ├── funding-opportunities/
│       │   ├── page.tsx
│       │   └── [slug]/page.tsx
│       ├── businesses/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/edit/page.tsx
│       ├── applications/
│       │   ├── page.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── edit/
│       │       └── documents/
│       ├── documents/page.tsx
│       ├── messages/page.tsx
│       ├── notifications/page.tsx
│       ├── saved-resources/page.tsx
│       └── help/page.tsx
├── (operations)/
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── work-queue/page.tsx
│       ├── applications/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── communications/
│       ├── reports/
│       ├── workflows/
│       ├── users/
│       └── audit-log/
├── (payload)/
│   ├── cms/
│   │   └── [[...segments]]/
│   │       ├── page.tsx
│   │       └── not-found.tsx
│   ├── api/[...slug]/route.ts
│   ├── custom.scss
│   └── layout.tsx
└── api/
    ├── auth/
    │   ├── session/route.ts
    │   ├── logout/route.ts
    │   └── me/route.ts
    ├── chatbot/route.ts
    ├── contact/route.ts
    ├── newsletter/route.ts
    ├── uploads/route.ts
    ├── exports/route.ts
    ├── webhooks/
    └── health/route.ts
```

| URL | Owner |
| --- | --- |
| `/` | Public website |
| `/portal` | Applicant portal |
| `/admin` | Internal operational workflow |
| `/cms` | Payload content administration |
| `/api/*` | Explicit Next.js and Payload APIs |

## Authentication structure

```text
src/auth/
├── firebase/
│   ├── client.ts
│   ├── admin.ts
│   ├── config.ts
│   ├── session.ts
│   └── errors.ts
├── authorization/
│   ├── capabilities.ts
│   ├── policy.ts
│   ├── current-user.ts
│   ├── require-user.ts
│   └── require-capability.ts
├── csrf/
│   ├── create-token.ts
│   └── verify-token.ts
└── types.ts
```

Browser Firebase code may import only browser-safe Firebase modules. Firebase Admin imports must remain server-only. Real Firebase projects are used; no emulator configuration is permitted.

The TOR business-role catalogue is Administrator, Editor, Author, Reviewer,
Programme Officer, Sector Specialist, and Approval Panel Member. The first four
roles are CMS-scoped and use `cms_`-prefixed internal codes to distinguish them
from platform administration.
Applicant and System Administrator are platform roles required for self-service
access and secure bootstrap/recovery. PostgreSQL owns these roles and their
capabilities; Payload only consumes the resolved capability set.

## PostgreSQL structure

```text
src/db/
├── client.ts
├── schema/
│   ├── identity.ts
│   ├── authorization.ts
│   ├── applicants.ts
│   ├── businesses.ts
│   ├── funding-calls.ts
│   ├── eligibility.ts
│   ├── applications.ts
│   ├── application-documents.ts
│   ├── workflow.ts
│   ├── reviews.ts
│   ├── decisions.ts
│   ├── communications.ts
│   ├── audit.ts
│   └── index.ts
├── repositories/
│   ├── UserRepository.ts
│   ├── ApplicationRepository.ts
│   ├── WorkflowRepository.ts
│   └── AuditRepository.ts
├── transaction.ts
└── types.ts
```

Application tables use the `app_` prefix. Firebase retains credentials; PostgreSQL stores application users and capability assignments.

## Payload structure

```text
src/payload/
├── collections/
│   ├── content/
│   │   ├── Pages.ts
│   │   ├── News.ts
│   │   ├── Resources.ts
│   │   ├── Events.ts
│   │   ├── FAQs.ts
│   │   └── Media.ts
│   ├── programme/
│   │   ├── FundingCalls.ts
│   │   ├── EligibilityContent.ts
│   │   └── ProgrammeStatistics.ts
│   └── system/CmsPrincipals.ts
├── globals/
│   ├── Header.ts
│   ├── Footer.ts
│   ├── Homepage.ts
│   ├── ContactDetails.ts
│   └── SiteSettings.ts
├── auth/firebase-session-strategy.ts
├── access/
│   ├── can-access-cms.ts
│   ├── can-create-content.ts
│   ├── can-review-content.ts
│   └── can-publish-content.ts
├── blocks/
│   ├── Hero.ts
│   ├── RichText.ts
│   ├── CallToAction.ts
│   ├── Statistics.ts
│   ├── ResourceGrid.ts
│   └── FAQList.ts
├── fields/
│   ├── slug.ts
│   ├── seo.ts
│   └── publishing.ts
├── hooks/
│   ├── revalidate-content.ts
│   └── record-content-audit.ts
├── migrations/
└── seed/
```

Payload content tables use the `cms_` prefix. `CmsPrincipals` is the minimum passwordless Payload user representation needed by the Admin Panel.

## Domain module convention

```text
src/modules/applications/
├── ClientApplicationService.ts
├── ServerApplicationService.ts
├── ApplicationHooks.ts
├── ApplicationSchemas.ts
└── ApplicationTypes.ts
```

`Client<Domain>Service.ts` is browser-safe and owns HTTP calls and response
parsing. `Server<Domain>Service.ts` is server-only and owns authorization and
business orchestration. A domain has one lifecycle; statuses never become
separate service or repository families. Split an oversized service by use
case, such as commands and queries, rather than by status or audience.

## Component ownership convention

```text
src/components/
├── applicant/
│   ├── applications/
│   ├── businesses/
│   ├── dashboard/
│   └── profile/
├── admin/
│   ├── applications/
│   └── dashboard/
├── public/
├── layout/
├── ui/
└── brand/
```

Audience is explicit in presentation paths. Core modules, schemas, and
repositories remain domain-based because applicant and admin views operate on
the same underlying domain records.

The required interactive client call direction is:

```text
client component
  -> TanStack Query hook
  -> frontend client service
  -> API route and transport validation
  -> backend policy/service
  -> repository or integration adapter
  -> PostgreSQL transaction when writing
  -> workflow event
  -> audit event
  -> notification/integration outbox
```

Server Components may call a backend service/query directly when interactive
browser caching is unnecessary. Pages and routes must not contain workflow or
database logic. The complete contract is in `CLIENT_DATA_ACCESS.md`.

## Integration structure

```text
src/integrations/
├── email/
│   ├── email-provider.ts
│   ├── smtp-provider.ts
│   └── templates/
├── storage/
│   ├── storage-provider.ts
│   ├── local-storage.ts
│   └── gcs-storage.ts
├── ai/
│   ├── ai-provider.ts
│   ├── chatbot.service.ts
│   └── retrieval.service.ts
├── analytics/
│   ├── analytics-provider.ts
│   ├── ga4.ts
│   └── application-events.ts
└── monitoring/
    ├── logger.ts
    └── telemetry.ts
```

GCP-specific adapters may be implemented only when the relevant hosting requirements and access are available.
