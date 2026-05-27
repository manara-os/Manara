# Production Deployment — Step-by-Step

**Goal:** From "running on localhost" to `https://app.manaraos.ae` live for prospects.
**Time required:** 90 minutes of your hands-on time (excluding DNS propagation).
**Cost:** ~$25/month first month (Railway + Vercel + domain).

This is the "you sit at the keyboard, I tell you what to do" version.

---

## Prerequisites — gather BEFORE you start

Open these in browser tabs:

- [ ] GitHub account where this repo lives (or push it there now)
- [ ] Credit card with Railway + Vercel approval headroom (~$25 holds)
- [ ] Domain name purchased — `manaraos.ae` (Namecheap, Cloudflare, GoDaddy, or local UAE registrar)
- [ ] A password manager open (1Password, Bitwarden) to save generated secrets
- [ ] This file open in another window for copy-paste

If you don't yet have the domain, buy it first:
- Namecheap: ~$50/year for `.ae`
- 1stdomains.ae (UAE-local): ~AED 200/year, requires UAE entity
- Or use `.com` / `.app` as a placeholder if entity not registered yet

---

## Step 1 — Push code to GitHub (5 min)

If the repo is already on GitHub, skip this.

```bash
cd "/Users/amit/Desktop/Property Management flows/Manara OS Claude Code"

# Check what's already configured
git remote -v
```

If no remote, create a new private repo at https://github.com/new → name it `manara-os` → private → click "Create".

Then locally:

```bash
git remote add origin git@github.com:YOUR_USERNAME/manara-os.git
git branch -M main
git push -u origin main
```

If you get an auth error, configure GitHub SSH first (https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

---

## Step 2 — Provision Postgres on Railway (10 min)

1. Go to **https://railway.app/login** → sign up with GitHub (recommended — one-click).
2. Click **+ New Project** → **Provision PostgreSQL**.
3. Wait ~30 seconds for the DB to spin up.
4. Click on the Postgres service → **Variables** tab → copy the `DATABASE_URL` value. Save it in your password manager as `MANARA_DATABASE_URL`.
5. Click **+ New** in the same project → **Database → Add Redis**.
6. Same drill — copy the `REDIS_URL`. Save as `MANARA_REDIS_URL`.

---

## Step 3 — Deploy API to Railway (15 min)

1. In the same Railway project, click **+ New** → **GitHub Repo** → authorise Railway → select `manara-os`.
2. Railway auto-detects the `railway.json` and the Dockerfile at `apps/api/Dockerfile`.
3. In the new service that appears, go to **Settings** → **Service Name**: rename to `manara-api`.
4. Go to **Variables** → **+ New Variable** → paste in everything below (substituting real values where shown):

```env
# Core
NODE_ENV=production
API_PORT=3001
API_PREFIX=api/v1
CORS_ORIGINS=https://app.manaraos.ae,https://manaraos.ae

# Database — Railway auto-links if you click "Add Reference"
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# JWT — GENERATE these with: openssl rand -base64 48
JWT_SECRET=PASTE_64_CHAR_RANDOM_HERE
JWT_REFRESH_SECRET=PASTE_DIFFERENT_64_CHAR_RANDOM_HERE

# PII encryption — REQUIRED
PII_ENCRYPTION_KEY=PASTE_32_CHAR_RANDOM_HERE
PII_ENCRYPTION_SALT=PASTE_16_CHAR_RANDOM_HERE

# Rate limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10

# Integrations — leave blank for simulation mode for now
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
OPENAI_API_KEY=
SENDGRID_API_KEY=
STRIPE_SECRET_KEY=

# Storage — set once S3 bucket is up
AWS_REGION=me-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=manara-prod

# Observability
SENTRY_DSN=
LOG_LEVEL=info

EMAIL_FROM=noreply@manaraos.ae
```

5. **Generate the secrets** locally — open a terminal:

```bash
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "PII_ENCRYPTION_KEY=$(openssl rand -base64 48 | head -c 32)"
echo "PII_ENCRYPTION_SALT=$(openssl rand -base64 24 | head -c 16)"
```

Copy each value → paste into the Railway Variables panel → **Save**. Also save them all to your password manager (you will NEVER see PII_ENCRYPTION_KEY again — losing it = losing all encrypted data).

6. Railway will auto-redeploy. Watch the **Deployments** tab. First build takes 5-7 minutes.

7. **Run the migration** — once the build is green, open Railway's CLI access:

```bash
# Install Railway CLI if you don't have it
brew install railway   # or: npm install -g @railway/cli

# Link to your project
railway login
cd "/Users/amit/Desktop/Property Management flows/Manara OS Claude Code"
railway link  # select the project + manara-api service

# Run migration
railway run --service manara-api npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate

# Run seed
railway run --service manara-api npx tsx packages/database/prisma/seed.ts
railway run --service manara-api npx tsx packages/database/prisma/seed-extras.ts
```

8. **Generate a public URL** — Railway → manara-api service → **Settings** → **Networking** → **Generate Domain**. You'll get something like `manara-api-production-xxxx.up.railway.app`. **Test it:**

```bash
curl https://manara-api-production-xxxx.up.railway.app/api/v1/health
```

Expect: `{"status":"ok",...}`.

✅ **API is live.**

---

## Step 4 — Configure Vercel for the web app (10 min)

The web app is already on Vercel from earlier work. We just need to point it at the new API.

1. Go to **https://vercel.com/dashboard** → find your `manara-os-web` (or whatever it's called) project.
2. **Settings → Environment Variables** → add:

```
NEXT_PUBLIC_API_URL=https://manara-api-production-xxxx.up.railway.app/api/v1
NEXT_PUBLIC_APP_URL=https://app.manaraos.ae
```

3. **Settings → Domains** → **Add Domain** → enter `app.manaraos.ae`. Vercel shows DNS records to add.

4. **Deployments → Redeploy** the latest commit so the env vars take effect.

---

## Step 5 — Point your domain (15 min config + 1-24h DNS propagation)

In your domain registrar dashboard (Namecheap / Cloudflare / etc.):

### For the web app at `app.manaraos.ae`:

Add a **CNAME record:**
```
Type:  CNAME
Host:  app
Value: cname.vercel-dns.com
TTL:   300
```

### For the marketing page at `manaraos.ae` (root):

Add an **A record** pointing to Vercel:
```
Type:  A
Host:  @
Value: 76.76.21.21
TTL:   300
```

### For the API at `api.manaraos.ae`:

Add a **CNAME record:**
```
Type:  CNAME
Host:  api
Value: manara-api-production-xxxx.up.railway.app
TTL:   300
```

Then in Railway → manara-api → **Settings → Networking → Custom Domain** → add `api.manaraos.ae` → Railway shows the CNAME target (should match what you added).

### Verify after 30-60 minutes:

```bash
nslookup app.manaraos.ae
nslookup api.manaraos.ae

curl https://api.manaraos.ae/api/v1/health  # should return ok
```

Visit `https://app.manaraos.ae` in incognito — should show login page with valid SSL.

✅ **You are live in production.**

---

## Step 6 — Update CORS to allow the production web (2 min)

After confirming the domain works, **edit one env var in Railway:**

`CORS_ORIGINS` → set to `https://app.manaraos.ae,https://manaraos.ae`

Railway auto-redeploys (~2 min).

---

## Step 7 — Test login end-to-end (5 min)

Open https://app.manaraos.ae in incognito.

Use the seeded demo phone (from `/Users/amit/.claude/projects/-Users-amit-Desktop-Property-Management-flows-Manara-OS-Claude-Code/memory/reference_test_logins.md`):
- Phone: `+971500000001` (or whichever is in your seed)
- OTP: `123456`

Verify:
- [ ] Dashboard loads with AI Suggestions
- [ ] You can navigate to Properties, Tenants, Owners, etc.
- [ ] Compliance Calendar shows 10 items
- [ ] Owner detail shows Receipt Vault with 4 receipts
- [ ] Ticket detail shows Bid Marketplace
- [ ] Vendors list shows leaderboard
- [ ] Reviews & NPS shows 8 reviews
- [ ] Language switcher flips to Arabic RTL
- [ ] WhatsApp thread on a tenant page shows 6 messages

If any of these fail:
- **404 / login broken** → check CORS env var and redeploy
- **Empty data** → re-run `seed-extras.ts`
- **500 errors** → check Railway logs for the API service

---

## Step 8 — Set up basic monitoring (10 min)

### Sentry (errors)

1. Sign up at https://sentry.io (free tier is fine).
2. Create project → **Node.js** → copy the DSN.
3. Add to Railway env: `SENTRY_DSN=https://...@sentry.io/...`
4. Install the SDK (engineer): `cd apps/api && npm install @sentry/node`. Then add to `main.ts`:
   ```typescript
   import * as Sentry from '@sentry/node';
   if (process.env.SENTRY_DSN) {
     Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
   }
   ```

### Uptime monitoring

1. Sign up at https://betteruptime.com (free tier: 10 checks).
2. Add HTTP check: `GET https://api.manaraos.ae/api/v1/health` every 1 minute.
3. Add escalation: SMS + WhatsApp to your number.
4. Public status page (optional): enable → custom domain `status.manaraos.ae`.

---

## Step 9 — Create a demo user / workspace (5 min)

You probably don't want prospects to see real customer data when you eventually have customers. So create a clean demo workspace:

```bash
# Run a one-off seed for a "demo" workspace
railway run --service manara-api npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ws = await p.workspace.create({
    data: {
      name: 'Manara OS Demo',
      slug: 'demo',
      subscriptionPlan: 'PROFESSIONAL',
      status: 'ACTIVE',
      contactEmail: 'demo@manaraos.ae',
    }
  });
  console.log('Demo workspace:', ws.id);
  await p.\$disconnect();
})();
"
```

Then create a demo phone login (e.g., `+971500099999` / OTP `123456`) and bookmark it for prospect demos.

---

## Step 10 — Production checklist

Before sharing the URL with prospects, verify:

- [ ] `https://app.manaraos.ae` loads with valid green-padlock SSL
- [ ] `https://api.manaraos.ae/api/v1/health` returns 200 OK
- [ ] You can log in
- [ ] All 9 production-push features render with data
- [ ] No console errors in Chrome DevTools
- [ ] Language switcher works (try Arabic)
- [ ] Sentry receives a test error (Railway logs: `throw new Error('test sentry')`)
- [ ] Uptime monitor reports green for 1 hour
- [ ] Database has been backed up (Railway auto-snapshot — verify in Postgres service → Backups)
- [ ] All secrets are saved in password manager (NOT just in Railway)

---

## Cost summary (month 1)

| Item | Cost |
|---|---|
| Railway (Postgres + Redis + API) | ~$15-25/mo |
| Vercel (web app + 2 mobile preview) | $0 (free tier) |
| Domain (.ae or .com) | $4-15/mo equivalent |
| Sentry | $0 (free tier) |
| Better Uptime | $0 (free tier) |
| **Total** | **~$20-40/month** |

After your first customer signs (AED 5,000+/mo gross), this rounds to a rounding error.

---

## What to do if something breaks

### "Build failed" on Railway
- Check the build logs. Most common: missing env var, wrong Dockerfile path.
- Verify `railway.json` shows `"dockerfilePath": "apps/api/Dockerfile"`.

### "Database connection error" in logs
- Check `DATABASE_URL` references `${{Postgres.DATABASE_URL}}` exactly.
- Verify Postgres service is in the same project.

### "CORS error" in browser console
- `CORS_ORIGINS` must include your web domain exactly (no trailing slash).
- Redeploy after changing.

### SSL certificate not provisioned
- DNS must propagate first. Wait 15-60 minutes.
- Verify CNAME with `dig +short app.manaraos.ae`.

### "Token error" / login fails
- JWT_SECRET probably wasn't set, or was changed after sessions were created.
- Clear browser localStorage and retry.

### "Cannot find module @prisma/client" at runtime
- Dockerfile didn't run `prisma generate`. Verify `apps/api/Dockerfile` includes the generate step.

---

## Going further

Once production is stable for a week:

### Better domain UX
- Add `www.manaraos.ae` → 301 redirect to apex
- Add `manaraos.com` (international) → 301 redirect to `.ae`

### Production-grade DB
- Migrate from Railway Postgres to **AWS RDS me-south-1** (UAE region) once you have a customer wanting data residency.
- Cost: ~$30-100/mo, but unblocks UAE enterprise deals.

### CDN for static assets
- Vercel already CDN-hosts the web app globally.
- For uploaded files: move from Railway-local to **AWS S3 me-south-1**.

### Real domain email
- Set up Google Workspace or Zoho Mail on `manaraos.ae` (you@manaraos.ae).
- Add SPF, DKIM, DMARC records — protects deliverability.

---

## What I (the AI) need from you to help further

If something goes wrong during the deployment, give me:

1. **The exact error message** (paste from logs/terminal)
2. **The step you were on** (e.g., "step 3, generating public URL")
3. **A screenshot** if it's a UI issue

I can't see your Railway dashboard, but I can interpret error messages and suggest fixes.

---

## Once you're live

1. Take screenshots of the dashboard, owner detail, compliance calendar, vendor leaderboard — use them in prospect emails.
2. Record a 90-second Loom of you logging in and clicking through. Attach to LinkedIn DMs.
3. Update your LinkedIn headline to: *"Building Manara OS — UAE-first property management"*.
4. Tweet/LinkedIn-post the launch: *"After [N] months, Manara OS is live. The first PM platform with native AECB credit reporting + FTA tax certs. UAE PMs — DM me for a free pilot."*

The system is built. The deployment is the easy part. **The hard part is getting in front of those 50 prospects.** Don't let perfection on infra delay outreach by even a day.

Good luck. You're closer than you think.
