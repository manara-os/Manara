# Manara OS — Deployment Recommendation

**Audience:** Founder
**Decision needed:** Where to host frontend, backend, database, file storage, mobile apps
**Recommendation status:** Final — proceed with this stack

---

## Short answer

You need **3 platforms**, not 1. Railway alone is technically possible but suboptimal for the frontend. Here's the recommended split:

| Layer | Platform | Why |
|---|---|---|
| **Frontend (web portal)** | **Vercel** | Made by Next.js team — zero-config, global edge CDN, free tier covers your first 5 customers |
| **Backend API** | **Railway** | Already configured (`railway.json` in repo), Dockerfile ready |
| **Postgres + Redis** | **Railway** (same project as API) | Co-located = low latency, single dashboard |
| **File storage (S3)** | **AWS S3 (me-south-1, Bahrain)** | UAE data residency requirement — separate from Railway |
| **Mobile apps** | **Expo EAS** | Already configured, builds + submits to App Store / Play Store |

---

## Why this split (the reasoning)

### Why NOT just Railway for everything

- Railway's static hosting for Next.js works but **has no edge CDN** → 800 ms first-paint for users outside the region your container runs in
- Vercel serves the web app from 100+ edge locations globally — UAE users get ~50 ms first-paint
- Vercel is **free** for your scale; Railway charges for the same bandwidth
- Next.js Server Components / ISR / Image Optimization all "just work" on Vercel; on Railway you'd be fighting it

### Why Railway for API + DB

- Postgres + Redis + your NestJS API in **one project** → internal networking, no egress costs between services
- `railway.json` is already in the repo
- $5/mo starter → ~$25–50/mo at trial-scale → scales linearly with customers
- One dashboard for DB metrics, logs, env vars, deploys — minimal ops overhead

### Why S3 separately

- UAE PDPL data residency: documents, lease PDFs, photos must stay in-region
- AWS S3 **me-south-1 (Bahrain)** is the closest UAE-resident region
- Railway has no built-in object storage — you'd lose the data residency story that enterprise PMs will ask about

---

## Cost breakdown — month 1

| Item | Cost |
|---|---|
| Railway (Postgres + Redis + API) | $15–25 |
| Vercel (web portal — Hobby tier) | $0 |
| AWS S3 me-south-1 (≤ 10 GB) | $1–3 |
| Domain (`.ae` via Namecheap or 1stdomains.ae) | $4–15 |
| Sentry (free tier) | $0 |
| Better Uptime (free tier) | $0 |
| **Total** | **~$20–45 / month** |

**At scale:**
- 10 paying customers: ~$80–150 / month
- 50 paying customers: ~$300–500 / month

At ~$5,000 MRR these costs are a rounding error.

---

## Where things go (concrete domain map)

```
manaraos.ae
├── app.manaraos.ae      → Vercel (Next.js web portal)  [already deployed]
├── api.manaraos.ae      → Railway (NestJS API + Postgres + Redis)
├── status.manaraos.ae   → Better Uptime status page (free)
├── cdn.manaraos.ae      → AWS S3 me-south-1 (optional, CloudFront in front)
└── docs.manaraos.ae     → Documentation site (later)
```

---

## Mobile apps deployment

**Build pipeline:** Expo EAS (already configured in each `mobile-*/` app folder)

```bash
# Production build for both platforms in one command
cd apps/mobile-owner && eas build --platform all --profile production
cd apps/mobile-tenant && eas build --platform all --profile production
cd apps/mobile-vendor && eas build --platform all --profile production
cd apps/mobile-pm && eas build --platform all --profile production

# Submit to stores
eas submit -p ios
eas submit -p android
```

**Prerequisites you must own:**
- **Apple Developer account**: $99 / year (https://developer.apple.com/programs/)
- **Google Play developer account**: $25 one-time (https://play.google.com/console/signup)
- Verified Apple ID + Google account in your or your company's name
- App Store screenshots (5.5", 6.5", 6.7" for iOS) + Play feature graphic

---

## Alternatives I considered but DON'T recommend

| Option | Verdict | Why |
|---|---|---|
| **AWS everything** (ECS + RDS + ElastiCache + CloudFront) | ❌ | Massive complexity, 3-week setup, $200+/mo minimum even idle. Save this for 50+ customer scale. |
| **Render** | ⚠️ | Decent, but Railway has better DX + free tier. Tie-breaker: Railway. |
| **Fly.io** | ❌ | Multi-region is nice but Fly has no UAE region — defeats the data-residency purpose |
| **Heroku** | ❌ | Salesforce killed the free tier, expensive at scale, dyno restarts hurt UX |
| **DigitalOcean App Platform** | ⚠️ | Works, but managed Postgres pricing is rough at scale |
| **Self-host on a VPS** | ❌ | You'll spend 5 hours/week on ops you should spend selling |
| **Single-platform Railway for web + API** | ❌ | First-paint latency hurts demos. Vercel is free anyway. |

---

## Honest caveat about Railway

Railway had some uptime wobbles in 2024. **For your first 5–10 customers it's fine.** Plan to migrate to AWS me-south-1 RDS + ECS once you're past ~$10k MRR — that's when:

1. UAE data residency becomes a **contractual** requirement from enterprise customers
2. You'll want multi-AZ Postgres for HA
3. You'll want VPC isolation for compliance audits

Until then, Railway is the right call. Premature optimisation kills startups.

---

## The action plan — 4 steps, ~90 minutes hands-on

### Step 1: Buy domain (10 min)
- **Recommended:** Namecheap (no UAE entity needed) — ~$50/year for `.ae`
- **Alternative (if you have a UAE trade licence):** 1stdomains.ae for `.ae` prestige
- **Placeholder:** Use `.com` or `.app` initially — swap later

### Step 2: Provision Railway (20 min)
1. Sign up at https://railway.app via GitHub
2. **New Project → Provision PostgreSQL** → wait 30 sec
3. **+ New → Database → Add Redis**
4. **+ New → GitHub Repo →** select this repo (`manara-os`)
5. Railway auto-detects `railway.json` → builds with Dockerfile

### Step 3: Set env vars on Railway (15 min)
Copy from `.env.production.example` — at minimum:

```bash
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
PII_ENCRYPTION_KEY=$(openssl rand -base64 48 | head -c 32)
PII_ENCRYPTION_SALT=$(openssl rand -base64 24 | head -c 16)
CORS_ORIGINS=https://app.manaraos.ae,https://manaraos.ae
```

**Save these secrets to a password manager simultaneously.** Losing `PII_ENCRYPTION_KEY` = losing all encrypted PII data.

### Step 4: Wire DNS (15 min + 1–24h propagation)
At your registrar add:

```
CNAME  app  → cname.vercel-dns.com
CNAME  api  → <your-railway-domain>.up.railway.app
A      @    → 76.76.21.21  (Vercel apex)
```

Then in Railway → API service → Networking → Custom Domain → add `api.manaraos.ae`. In Vercel → Settings → Domains → add `app.manaraos.ae`.

### Step 5: Run migrations + seed (10 min)
```bash
brew install railway
railway login
railway link  # select project + manara-api service
railway run npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate
railway run npx tsx packages/database/prisma/seed.ts
railway run npx tsx packages/database/prisma/seed-extras.ts
railway run npx tsx packages/database/prisma/seed-enrichment.ts
```

### Step 6: Smoke test (5 min)
- `curl https://api.manaraos.ae/api/v1/health` → expect `{"status":"ok"}`
- Open `https://app.manaraos.ae` in incognito → log in with `+971501000002` / OTP `123456`
- Click through 5 features → confirm data renders

---

## What you DON'T need to do today

- ❌ Set up AWS account — leave that for when first customer asks for data residency
- ❌ Configure Twilio / OpenAI / Stripe API keys — system runs in simulation mode without them
- ❌ Set up CI/CD — Railway auto-deploys on `git push`
- ❌ Buy enterprise observability — Sentry free tier + Better Uptime free tier suffice
- ❌ Worry about scaling — Railway autoscales until you hit ~$200/mo, then talk to them

---

## When to graduate from Railway to AWS

| Trigger | Action |
|---|---|
| First enterprise prospect asks for data residency proof | Move S3 buckets to me-south-1 if not already |
| First contract requires SLA > 99.9% | Move Postgres to RDS multi-AZ |
| MRR > $10k or > 20 customers | Plan full AWS migration during a quiet sprint |
| First SOC 2 audit | Migrate to AWS for the audit-friendliness |
| Pen-test surfaces single-region risk | Add multi-region failover |

---

## TL;DR for the impatient

**Buy domain → sign up Railway → push to GitHub → wait 24h for DNS → first prospect demo on real URL tomorrow.**

Total cost: ~$20–45 / month until you're at 10+ customers.
Total time-to-live: 90 min of hands-on work + DNS propagation wait.

The platform is ready. The deployment is the easy part. **The bottleneck is now sales, not engineering.**

---

## Related documents

- `sales-kit/05-deployment-guide.md` — the click-by-click Railway + Vercel guide
- `HUMAN_TASKS.md` — everything else humans must do (Twilio approval, payment gateway, legal)
- `.env.production.example` — every env var the API supports
- `railway.json` — Railway deployment config (already in repo)
