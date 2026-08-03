# Free deployment — Manara OS (testing)

Zero-cost stack for a testing environment. Nothing here needs a card, and each
piece upgrades to a paid tier later without touching application code.

| Piece | Service | Free limits | Upgrade path |
| --- | --- | --- | --- |
| Web (Next.js) | **Vercel** Hobby | 100 GB bandwidth/mo | Pro $20/mo |
| API (NestJS) | **Render** Web Service (Docker) | 512 MB RAM, sleeps after 15 min idle | Starter $7/mo (no sleep) |
| Postgres | **Neon** | 0.5 GB, always free | Launch $19/mo |
| Redis | **Upstash** | 500K commands/mo | Pay-as-you-go |

Render's own free Postgres expires after 30 days and it has no free Redis —
that is why the database and cache live on Neon and Upstash instead. They are
declared as `sync: false` secrets in [`render.yaml`](render.yaml), so swapping
either one is a dashboard edit.

---

## 1. Postgres — Neon

Done — project lives in **AWS us-east-2 (Ohio)**, which is why `render.yaml`
pins the API to Render's `ohio` region.

Use the direct connection string (`ep-…us-east-2.aws.neon.tech/neondb?sslmode=require`),
not the `-pooler` variant: the same `DATABASE_URL` runs `prisma migrate deploy`
at boot, and migrations need a direct connection. One free Render instance
opens few enough connections that pooling buys nothing here.

Paste it straight into Render's dashboard field — it contains the password, so
it should not travel through anything else.

## 2. Redis — Upstash

1. Sign up at upstash.com, create a Redis database — pick **us-east-2** to match Neon.
2. Copy the `rediss://…` URL from the **Redis Connect** tab.
3. Paste it into Render as `REDIS_URL`.

BullMQ connects at boot. Without a real Redis the API still starts, but every
queue-backed feature (notifications, scheduled reports, PDF jobs) fails.

## 3. API — Render

1. Render Dashboard → **New → Blueprint** → select the `manara-os/Manara` repo.
   Render reads [`render.yaml`](render.yaml) and creates the `manara-api` service.
2. Fill the secrets it prompts for:
   - `DATABASE_URL` — Neon pooled string
   - `REDIS_URL` — Upstash string
   - `CORS_ORIGINS` — leave as `http://localhost:3000` for now; step 5 replaces it
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PLATFORM_ADMIN_SECRET` are generated
     automatically by Render.
3. First deploy runs `prisma migrate deploy` against Neon, then boots the API.
4. Verify: `https://manara-api-XXXX.onrender.com/api/v1/health`

Render's GitHub integration is a plain OAuth app, not an org-scoped GitHub App
— it does not hit the repo-access problem that blocked Railway.

## 4. Web — Vercel

The project is already linked (`.vercel/` exists, project `manara-os`).

```bash
vercel env add NEXT_PUBLIC_API_URL production
```

Value: `https://manara-api-XXXX.onrender.com/api/v1` — the `/api/v1` suffix
matters, [`apps/web/src/lib/api.ts`](apps/web/src/lib/api.ts) appends paths to it directly.

**Do not skip this.** [`apps/web/next.config.js`](apps/web/next.config.js) falls back to a hard-coded
Railway URL (`api-production-24b5.up.railway.app`) for production builds. That
host is dead. The env var wins when set, but if it is missing the build
succeeds and every request silently fails against the stale host — replace the
`PROD_API_URL` constant with the Render URL to remove the trap entirely.

Then:

```bash
vercel --prod
```

## 5. Close the CORS loop

Back in Render, set `CORS_ORIGINS` to the Vercel URL and redeploy:

```
https://manara-os.vercel.app,http://localhost:3000
```

[`apps/api/src/main.ts`](apps/api/src/main.ts) rejects any origin not on this list, so a
missing entry shows up as a browser CORS error rather than a server error.

## 6. Seed test data

```bash
DATABASE_URL="<neon-url>" npm run db:seed
```

---

## Known limits of the free tier

- **Cold starts.** The Render free instance sleeps after 15 minutes idle; the
  next request takes ~50 seconds. Fine for testing, not for a demo to a client
  — for that, $7/mo Starter removes it.
- **512 MB RAM.** This NestJS app boots in roughly 250–350 MB. Heavy report
  generation may hit the ceiling.
- **No file storage.** S3 (`AWS_*`) and Stripe/Twilio/OpenAI keys are unset, so
  uploads, payments, WhatsApp, and AI features stay disabled until real
  credentials are added. Everything else works.
- **Mobile apps** are not covered here — Expo apps ship through EAS Build, and
  only need `NEXT_PUBLIC_API_URL`'s equivalent pointed at the Render URL.
