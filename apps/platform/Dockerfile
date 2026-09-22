# syntax=docker/dockerfile:1.7

FROM node:24.13.0-bookworm-slim AS dependencies
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/platform/package.json apps/platform/package.json

RUN --mount=type=cache,id=prosme-npm,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

FROM node:24.13.0-bookworm-slim AS builder
WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/platform apps/platform
COPY --chmod=755 scripts/container/build.sh scripts/container/build.sh

RUN --mount=type=cache,id=prosme-next,target=/workspace/apps/platform/.next/cache,sharing=locked \
    scripts/container/build.sh

FROM dependencies AS migrations

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --chown=nextjs:nodejs apps/platform apps/platform
COPY --chown=nextjs:nodejs \
    scripts/seed/package.json \
    scripts/seed/seed-standard-forms.ts \
    scripts/seed/seed-standard-eligibility.ts \
    scripts/seed/seed-standard-workflow.ts \
    scripts/seed/
COPY --chown=nextjs:nodejs --chmod=755 \
    scripts/container/migrate.sh scripts/container/migrate.sh

USER nextjs
CMD ["scripts/container/migrate.sh"]

FROM node:24.13.0-bookworm-slim AS runtime
WORKDIR /workspace

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs \
    /workspace/apps/platform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs \
    /workspace/apps/platform/.next/static ./apps/platform/.next/static
COPY --from=builder --chown=nextjs:nodejs \
    /workspace/apps/platform/public ./apps/platform/public
COPY --from=builder --chown=nextjs:nodejs \
    /workspace/apps/platform/media ./apps/platform/media
COPY --chown=nextjs:nodejs --chmod=755 \
    scripts/container/healthcheck.sh scripts/container/healthcheck.sh

WORKDIR /workspace/apps/platform
USER nextjs
EXPOSE 3008

CMD ["node", "server.js"]
