# HostingIt control panel — build from repo root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_APP_URL=https://hostingit.online \
#     --build-arg NEXT_PUBLIC_BASE_DOMAIN=hostingit.online \
#     --build-arg NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX=fhusr \
#     -t hostingit .
#
# NEXT_PUBLIC_* must be set at build time (baked into the client bundle).

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/dokploy-client/package.json ./packages/dokploy-client/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=https://hostingit.online
ARG NEXT_PUBLIC_BASE_DOMAIN=hostingit.online
ARG NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX=fhusr

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BASE_DOMAIN=$NEXT_PUBLIC_BASE_DOMAIN
ENV NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX=$NEXT_PUBLIC_FREE_SUBDOMAIN_PREFIX
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV AUTH_SECRET=build-time-placeholder-not-used-at-runtime

RUN npm run build --workspace=apps/web

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Schema auto-push on container start (uses builder node_modules for drizzle-kit + TS)
COPY --from=builder /app/node_modules ./db-node_modules
COPY --from=builder /app/apps/web/drizzle.config.ts ./apps/web/drizzle.config.ts
COPY --from=builder /app/apps/web/src/db ./apps/web/src/db
COPY apps/web/scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
