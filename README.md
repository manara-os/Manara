# Manara OS — UAE Property Management Operating System

> Enterprise-grade, multi-tenant SaaS platform for UAE property management companies.  
> Arabic: منارة (Manara) = Lighthouse.

[![CI](https://github.com/manaraos/manara-os/actions/workflows/ci.yml/badge.svg)](https://github.com/manaraos/manara-os/actions)
[![License: Commercial](https://img.shields.io/badge/License-Commercial-red.svg)]()

---

## Architecture Overview

```
manara-os/
├── apps/
│   ├── api/              # NestJS REST API (Node.js 20, TypeScript)
│   ├── web/              # Next.js 15 web dashboard (TypeScript, TailwindCSS)
│   ├── mobile-owner/     # Expo SDK 54 — Owner app (Emerald #10B981)
│   ├── mobile-tenant/    # Expo SDK 54 — Tenant app (Indigo #4F46E5)
│   └── mobile-vendor/    # Expo SDK 54 — Vendor app (Amber #E2B93B)
├── packages/
│   ├── shared/           # Shared enums, utils, RERA calculation logic
│   └── database/         # Prisma schema, migrations, seed
├── infrastructure/
│   └── kubernetes/       # K8s manifests (base + overlays)
└── .github/
    └── workflows/        # CI/CD pipelines
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, TypeScript, REST + WebSocket |
| Database | PostgreSQL 16, Prisma ORM |
| Cache / Queues | Redis 7, BullMQ |
| Auth | JWT (15m access + 7d refresh), OTP via Twilio |
| Storage | AWS S3-compatible (Wasabi) |
| Payments | Stripe |
| AI | OpenAI GPT-4o, Twilio TTS calls |
| Frontend | Next.js 15, TailwindCSS, shadcn/ui, Framer Motion |
| Mobile | Expo SDK 54, React Native New Architecture (Hermes v96) |
| Infra | Docker, Kubernetes, GitHub Actions |
| Monitoring | Sentry |

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli eas-cli`)

### 1. Clone and install

```bash
git clone https://github.com/manaraos/manara-os.git
cd manara-os
pnpm install
```

### 2. Start infrastructure services

```bash
docker-compose up -d postgres redis
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit both files with your credentials
```

### 4. Run database migrations and seed

```bash
cd packages/database
pnpm prisma migrate dev
pnpm prisma db seed
```

### 5. Start the API

```bash
cd apps/api
pnpm start:dev
# Runs on http://localhost:3001
# Swagger UI: http://localhost:3001/api/docs
```

### 6. Start the web dashboard

```bash
cd apps/web
pnpm dev
# Runs on http://localhost:3000
```

### 7. Start a mobile app

```bash
cd apps/mobile-vendor
npx expo start
# Press 'i' for iOS simulator, 'a' for Android emulator
```

## Demo Credentials

All accounts use OTP `123456` in development.

| Role | Phone | Description |
|------|-------|-------------|
| PM Admin | +971501000002 | Full workspace access |
| Owner | +971501000010 | Property portfolio view |
| Tenant (Hassan) | +971501000020 | Active lease, 6 PDC cheques |
| Tenant (Fatima) | +971501000021 | Active lease |
| Vendor | +971501000030 | Plumbing specialist |

## Key Features

### UAE Compliance
- **Ejari Integration**: DLD lease registration (mock in dev, live in production)
- **RERA Rent Index**: Smart rental increase limits (0/5/10/15/20% bands)
- **PDC Management**: Post-dated cheque tracking with clearance workflow
- **VAT 5%**: Applied to management fees and invoices

### Multi-Tenant Architecture
- Each PM company = isolated workspace
- Subdomain routing: `{company}.manaraos.ae`
- Row-level security via `workspaceId` FK on all entities
- 6 RBAC roles: PLATFORM_ADMIN, PM_ADMIN, PM_OPS, OWNER, TENANT, VENDOR

### AI Features
- Automated rent follow-up calls (OpenAI TTS + Twilio)
- WhatsApp fallback for non-answering tenants
- AI-powered rent increase recommendations (RERA-compliant)

### Mobile Apps
- **Owner App**: Portfolio overview, financials, documents
- **Tenant App**: Lease info, payments (PDC), maintenance requests, documents
- **Vendor App**: Job queue, active jobs, history, push notifications
- All apps use Expo Push Notifications (FCM for tenant, Expo for owner/vendor)

## API Documentation

Swagger UI available at: `http://localhost:3001/api/docs`

Key API groups:
- `POST /api/v1/auth/send-otp` — Request OTP
- `POST /api/v1/auth/verify-otp` — Verify OTP → JWT
- `GET /api/v1/properties` — List properties
- `GET /api/v1/tickets/board` — Kanban board
- `POST /api/v1/ai/rent-call/:leaseId` — Trigger AI rent call
- `GET /api/v1/finance/summary` — Dashboard summary
- `POST /api/v1/billing/webhook` — Stripe webhook (raw body)

## Environment Variables

See `apps/api/.env.example` for the complete list. Critical variables:

```bash
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # Min 32 chars
REDIS_URL             # Redis connection string
TWILIO_ACCOUNT_SID    # For OTP + AI calls
OPENAI_API_KEY        # For AI rent follow-up
STRIPE_SECRET_KEY     # For subscription billing
STRIPE_WEBHOOK_SECRET # For webhook verification
AWS_S3_BUCKET         # For document storage
```

## Running Tests

```bash
# All tests
pnpm test

# API tests with coverage
cd apps/api && pnpm test --coverage

# Watch mode
cd apps/api && pnpm test:watch
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment guide.

### Quick Docker build

```bash
# Build API
docker build -f apps/api/Dockerfile -t manara-api:latest .

# Build Web
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.manaraos.ae/api/v1 \
  -t manara-web:latest .

# Run with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

### Kubernetes deploy

```bash
# Staging
kubectl apply -k infrastructure/kubernetes/overlays/staging

# Production (requires IMAGE_TAG env var)
IMAGE_TAG=abc123 kustomize build infrastructure/kubernetes/overlays/production | kubectl apply -f -
```

## BullMQ Queue Reference

| Queue | Purpose |
|-------|---------|
| `notifications` | Email, SMS, WhatsApp, push notifications |
| `renewal-alerts` | Lease renewal reminders (90/60/30 days) |
| `ejari` | DLD lease registration jobs |
| `ai-calls` | OpenAI TTS rent follow-up calls |
| `pma-alerts` | Property Management Association alerts |
| `document-expiry` | Expiring document notifications |

## Contributing

1. Branch from `develop`
2. Follow the `feature/`, `fix/`, `chore/` naming convention
3. All PRs require passing CI + 1 reviewer approval
4. Merge to `develop` → auto-deploy to staging
5. Merge to `main` → requires manual production approval

## License

Commercial — All rights reserved. © 2025 Manara OS FZ-LLC, Dubai, UAE.
