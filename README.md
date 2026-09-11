# SME Fund Platform

The production foundation for the SME Fund platform under the ProSME Project. The approved Option B experience, backend route handlers, applicant portal, internal operations, and Payload CMS run as one Next.js application.

## Architecture

- Application: `apps/platform`
- Frontend and backend: Next.js App Router with TypeScript
- CMS: Payload CMS embedded at `/cms`
- Authentication: real Firebase Authentication; no Firebase emulator
- Authorization and application data: PostgreSQL
- Local database: PostgreSQL 16 through Docker Compose
- Eventual hosting: GCP after the landing zone and operational requirements are approved

Firebase owns credentials and authentication. PostgreSQL owns users, roles, and capabilities. Payload has no local password strategy.

Read the controlling documents before changing the implementation:

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Approved project structure](docs/architecture/PROJECT_STRUCTURE.md)
- [Repository rules](AGENTS.md)

## Local prerequisites

- Node.js 24.13.0
- npm 11 or compatible
- Docker with Compose
- A real Firebase development project with Email/Password authentication enabled
- A Firebase web application configuration
- Firebase Admin credentials for local server use

The Firebase Authentication Emulator is intentionally unsupported.

## Configuration

Copy `.env.example` to the repository-root `.env.local` and provide the real development Firebase values. Use either `FIREBASE_SERVICE_ACCOUNT_JSON` or the split client-email/private-key fields for local Firebase Admin access. On GCP, workload identity and Application Default Credentials will replace local service-account material.

Never commit `.env.local`, service-account JSON, or real applicant data.

## Start locally

```bash
npm ci
docker compose -f infrastructure/local/compose.yaml up -d
npm run db:migrate --workspace @prosme/platform
npm run payload --workspace @prosme/platform -- migrate
npm run dev
```

The default routes are:

| URL | Purpose |
| --- | --- |
| `http://localhost:3000` | Public website |
| `http://localhost:3000/sign-in` | Firebase sign-in |
| `http://localhost:3000/portal` | Applicant portal |
| `http://localhost:3000/admin` | Internal operations |
| `http://localhost:3000/cms` | Payload CMS |
| `http://localhost:3000/api/health` | Application and database readiness |

## Staff bootstrap

First create and verify the staff account in the real Firebase development project. Then assign its PostgreSQL role and create its passwordless Payload principal:

```bash
BOOTSTRAP_STAFF_EMAIL=staff@example.com \
BOOTSTRAP_STAFF_ROLE=system_administrator \
npm run bootstrap:staff --workspace @prosme/platform
```

Available seeded role codes include `cms_editor`, `programme_administrator`, and `system_administrator`.

## Verification

```bash
npm run check:files
npm run lint
npm run typecheck
npm run test
npm run build
```

The combined command is `npm run check`. Database migrations are verified separately because they require PostgreSQL.

Phase 1 cannot pass G1 until the real Firebase applicant and CMS access scenarios have been executed and recorded in `docs/testing/gates/G1-foundation.md`.

## Archived concepts

The inactive Option A and Option C applications are retained under `archive/design-concepts` as M2 evidence. They are not npm workspaces and are excluded from the active build.
