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

Copy `.env.example` to the repository-root `.env` and provide the real development Firebase values. Use either `FIREBASE_SERVICE_ACCOUNT_JSON` or the split client-email/private-key fields for local Firebase Admin access. On GCP, workload identity and Application Default Credentials will replace local service-account material.

Never commit `.env`, service-account JSON, or real applicant data.

## Start with Docker Compose

After creating `.env`, build and start PostgreSQL and the application:

```bash
./scripts/docker-up.sh --build
```

The Bash wrapper validates Compose, builds the standalone image, starts
PostgreSQL, runs the committed Drizzle and Payload migrations, and waits for the
application health check. It also runs the single idempotent database seeder on
every startup. PostgreSQL data and Payload media uploads are retained in named
volumes. Environment-specific values are supplied by Compose at runtime; the
image build does not read `.env` or receive deployment configuration.

When `.env` contains `ENVIRONMENT=local`, the wrapper combines
`infrastructure/compose.yaml` with
`infrastructure/local/compose.local.override.yml`. Other environments, including
GCP deployments, use only `infrastructure/compose.yaml`.

The temporary development database uses local-only `POSTGRES_*` defaults defined
in Compose. The `DATABASE_URL` in `.env` uses the same development credentials
and the `db` service hostname. Non-Compose deployments supply their own
`DATABASE_URL` at runtime.

The build uses reusable npm and Next.js BuildKit caches. After a successful
build, the wrapper removes dangling images and cache entries unused for seven
days. Inspect or prune Docker storage directly with:

```bash
./scripts/docker-maintenance.sh diagnose
./scripts/docker-maintenance.sh prune
```

Payload automatic development schema pushing is disabled. After a schema change, generate and apply a committed Payload migration before starting the application.

The default routes are:

| URL | Purpose |
| --- | --- |
| `http://localhost:3008` | Public website |
| `http://localhost:3008/sign-in` | Firebase sign-in |
| `http://localhost:3008/portal` | Applicant portal |
| `http://localhost:3008/admin` | Internal operations |
| `http://localhost:3008/cms` | Payload CMS |
| `http://localhost:3008/api/health` | Application and database readiness |

## Staff bootstrap

First create and verify the staff account in the real Firebase development project. Then assign its PostgreSQL role and create its passwordless Payload principal:

```bash
./scripts/bootstrap-admin.sh staff@example.com
```

The bootstrap command only assigns `system_administrator`. Other staff roles
must be assigned through the authorised role-management workflow.

The TOR role codes are `cms_administrator`, `cms_editor`, `cms_author`,
`cms_reviewer`, `programme_officer`, `sector_specialist`, and
`approval_panel_member`. The platform also retains `applicant` for self-service
users and `system_administrator` for secure platform bootstrap and recovery.

## Public content

`npm run db:seed --workspace @prosme/platform` is the single seeding entry point. It delegates to focused seed modules and idempotently publishes the baseline public pages, site globals, homepage blocks, programme statistics, eligibility questions, focus sectors, FAQs, funding call, and criteria document. Content editors can then manage media, versions, review state, authenticated previews, publishing, and restoration in `/cms`.

Contact enquiries and consented newsletter subscriptions are stored in Payload under the Engagement group. Add the approved GA4 measurement ID under Site Settings; analytics remains disabled until a visitor consents. Approved photography can be uploaded in Media and selected on the homepage, pages, news, resources, events, and funding calls.

## Verification

```bash
npm run check:files
npm run lint
npm run typecheck
npm run test
npm run build
```

The combined command is `npm run check`. Database migrations are verified separately because they require PostgreSQL.

Install Chromium once with `npx playwright install --with-deps chromium`, then run `npm run test:public` for the public-route axe, responsive-layout, and asset-budget checks.

Gate evidence and outstanding acceptance items are recorded in `docs/testing/gates/G1-foundation.md` and `docs/testing/gates/G2-public-website.md`.

## Archived concepts

The inactive Option A and Option C applications are retained under `archive/design-concepts` as M2 evidence. They are not npm workspaces and are excluded from the active build.
