# Manara OS — Local, Vercel & Railway Setup

Split deployment: **web → Vercel**, **API + Postgres + Redis → Railway**.
(`DEPLOYMENT.md` covers the alternative Kubernetes path.)

---

## 1. Local development

### Prerequisites
- Node.js 20+ and npm 10+
- Docker Desktop (for Postgres + Redis)

### Start infrastructure

```bash
docker compose -f docker-compose.local.yml up -d
```

Postgres listens on **5433** (host) → 5432 (container); Redis on **6379**.
These must match `DATABASE_URL` / `REDIS_URL` in the root `.env`.

### Install dependencies

```bash
npm install
```

This installs all workspaces and writes `package-lock.json`. **The lockfile must be
committed** — both the Vercel install command and the API Dockerfile use `npm ci`,
which fails without it.

### Apply the database schema

```bash
npm run db:migrate --workspace=packages/database
npm run db:seed --workspace=packages/database
```

### Run

```bash
npm run dev
```

- API → http://localhost:3001 (Swagger at http://localhost:3001/docs)
- Web → http://localhost:3000

### Demo login
Any account below with OTP `123456` (dev bypass is active when `NODE_ENV=development`).

| Role | Phone |
|------|-------|
| PM Admin | +971501000002 |
| Owner | +971501000010 |
| Tenant | +971501000020 |
| Vendor | +971501000030 |

---

## 2. Railway — API

Deploy the API first; the web app needs its public URL.

### Services to create
1. **Postgres** — Railway plugin. Exposes `DATABASE_URL`.
2. **Redis** — Railway plugin. Exposes `REDIS_URL`. Required: BullMQ backs all
   queues (notifications, renewal alerts, Ejari, AI calls).
3. **API** — deploy from the GitHub repo. `railway.json` selects the Dockerfile
   builder with `apps/api/Dockerfile`.

### Environment variables

Reference the plugin values rather than pasting literals:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
NODE_ENV=production
API_PREFIX=api/v1
JWT_SECRET=<random, min 32 chars>
JWT_REFRESH_SECRET=<random, min 32 chars, different from above>
PLATFORM_ADMIN_SECRET=<random>
ENCRYPTION_KEY=<32-byte hex>
ENCRYPTION_IV=<16-byte hex>
CORS_ORIGINS=https://<your-vercel-domain>
```

Do **not** set `PORT` — Railway injects it, and the API now honours it.

Optional integrations (Twilio, OpenAI, Stripe, AWS, Firebase, Sentry) are validated
as optional; leave them unset until you have live credentials.

### Notes
- `railway.json` runs `prisma migrate deploy` before starting, so the schema is
  applied on each release.
- Health check: `/api/v1/health`.
- Generate secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 3. Vercel — web

### Project settings
- **Root Directory**: repository root (leave blank). `vercel.json` builds the
  `apps/web` workspace and outputs to `apps/web/.next`.
- Framework preset: Next.js (auto-detected).

### Environment variables

Set these in **Project → Settings → Environment Variables** (plain values — the old
`@secret` reference syntax has been removed from `vercel.json` because Vercel no
longer supports it):

```
NEXT_PUBLIC_API_URL=https://<your-railway-domain>/api/v1
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
```

`NEXT_PUBLIC_*` values are inlined at build time — changing them requires a redeploy.

### After deploying
Set `CORS_ORIGINS` on Railway to the final Vercel domain, then redeploy the API.
The browser calls the API directly, so a CORS mismatch surfaces as failed requests
even though both services are healthy.

---

## 4. Known gaps

- `apps/web/Dockerfile` is broken and unused on this path: it expects
  `pnpm-lock.yaml` / `pnpm-workspace.yaml` (this repo uses npm workspaces), filters
  on a package name (`manara-web`) that does not exist, and copies
  `.next/standalone`, which is never produced because `next.config.js` does not set
  `output: 'standalone'`. Vercel does not use it. Fix it only if you need a
  container image for the web app.
- The mobile apps (`apps/mobile-*`) are outside this deployment path and ship via EAS.
