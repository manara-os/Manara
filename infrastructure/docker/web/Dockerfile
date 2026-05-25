# ═══════════════════════════════════════════════════════════════
# MANARA OS — WEB DOCKERFILE (Multi-stage Next.js)
# ═══════════════════════════════════════════════════════════════

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/
RUN npm ci && npm cache clean --force

FROM base AS dev-deps
COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/
RUN npm ci && npm cache clean --force

FROM dev-deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build --workspace=apps/web

FROM dev-deps AS development
COPY . .
EXPOSE 3000
ENV NEXT_TELEMETRY_DISABLED 1
CMD ["dumb-init", "npm", "run", "dev", "--workspace=apps/web"]

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.js ./apps/web/
COPY --from=builder /app/apps/web/package.json ./apps/web/

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["dumb-init", "node", "apps/web/node_modules/.bin/next", "start", "--prefix", "apps/web", "-p", "3000"]
