# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---- deps stage ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
RUN npm ci --workspace=apps/api --workspace=packages/shared --workspace=packages/database --include-workspace-root

# ---- builder stage ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:api
RUN npx --prefix apps/api prisma generate --schema=packages/database/prisma/schema.prisma

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

USER nestjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
