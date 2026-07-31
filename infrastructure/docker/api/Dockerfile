# ═══════════════════════════════════════════════════════════════
# MANARA OS — API DOCKERFILE (Multi-stage)
# ═══════════════════════════════════════════════════════════════

# ── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init python3 make g++ libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production

# ── Dependencies ─────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY packages/database/package*.json packages/database/
COPY packages/shared/package*.json packages/shared/
RUN npm install --only=production --legacy-peer-deps && npm cache clean --force

# ── Dev Dependencies ─────────────────────────────────────────
FROM base AS dev-deps
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY packages/database/package*.json packages/database/
COPY packages/shared/package*.json packages/shared/
RUN npm install --legacy-peer-deps && npm cache clean --force

# ── Builder ──────────────────────────────────────────────────
FROM dev-deps AS builder
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=apps/api

# ── Development ──────────────────────────────────────────────
FROM dev-deps AS development
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
EXPOSE 3001
CMD ["dumb-init", "npm", "run", "dev", "--workspace=apps/api"]

# ── Production ───────────────────────────────────────────────
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["dumb-init", "node", "apps/api/dist/main.js"]
