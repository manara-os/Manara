# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---- deps stage ----
FROM base AS deps
# `puppeteer` is declared but never imported by the API, and its postinstall
# pulls a ~150MB Chromium that does not run on alpine anyway.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
RUN npm ci --workspace=apps/api --workspace=packages/shared --workspace=packages/database --include-workspace-root

# ---- builder stage ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The API imports `@prisma/client` types directly, so the client must be
# generated BEFORE nest build or the compiler sees the ungenerated stub.
RUN ./node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build:api

# ---- runner stage ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
# npm workspaces hoist dependencies (and the generated .prisma client) to the ROOT
# node_modules, so that is the tree the runtime needs.
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json

# Winston adds file transports when NODE_ENV=production and creates `logs/`
# relative to the working directory — which the non-root user cannot write to
# unless the directory already exists and belongs to it.
RUN mkdir -p /app/logs && chown nestjs:nodejs /app/logs

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nestjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

# Migrations run here rather than in a platform start-command, so local runs
# and deployed runs take the identical startup path.
CMD ["./docker-entrypoint.sh"]
