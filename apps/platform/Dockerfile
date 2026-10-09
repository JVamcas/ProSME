# syntax=docker/dockerfile:1.7

FROM node:24.13.0-bookworm-slim AS dependencies
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/platform/package.json apps/platform/package.json

RUN --mount=type=cache,id=prosme-npm,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

FROM dependencies AS builder

ARG ENVIRONMENT=local

COPY apps/platform apps/platform
COPY --chmod=755 scripts/container/build.sh scripts/container/build.sh

RUN --mount=type=cache,id=prosme-next,target=/workspace/apps/platform/.next/cache,sharing=locked \
    ENVIRONMENT="${ENVIRONMENT}" scripts/container/build.sh

FROM dependencies AS migrations

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --chown=nextjs:nodejs apps/platform apps/platform
COPY --chown=nextjs:nodejs \
    scripts/seed/package.json \
    scripts/seed/seed-standard-forms.ts \
    scripts/seed/seed-standard-eligibility.ts \
    scripts/seed/seed-standard-workflow.ts \
    scripts/seed/seed-notifications.ts \
    scripts/seed/seed-reporting.ts \
    scripts/seed/reset-platform-data.ts \
    scripts/seed/
COPY --chown=nextjs:nodejs --chmod=755 \
    scripts/container/migrate.sh scripts/container/migrate.sh

USER nextjs
CMD ["scripts/container/migrate.sh"]

FROM node:24.13.0-bookworm-slim AS runtime
WORKDIR /workspace

# PDF first-page rendering and Word/Excel conversion for CMS resources.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      poppler-utils=22.12.0-2+deb12u3 \
      libreoffice-writer=4:7.4.7-1+deb12u14 \
      libreoffice-calc=4:7.4.7-1+deb12u14 \
      fonts-liberation=1:1.07.4-11 \
    && rm -rf /var/lib/apt/lists/*

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
    scripts/container/healthcheck.sh \
    scripts/container/notification-scheduler-healthcheck.mjs \
    scripts/container/notification-scheduler.mjs \
    scripts/container/scheduled-processor.mjs \
    scripts/container/

WORKDIR /workspace/apps/platform
RUN mkdir -p .next/cache/images .next/cache/cms-media \
    && chown -R nextjs:nodejs .next/cache
USER nextjs
EXPOSE 3008

CMD ["node", "server.js"]
