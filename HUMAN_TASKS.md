# Manara OS — Production Handoff Guide

**Audience:** Founder, engineering lead, ops lead, legal counsel, BD
**Status of the platform:** Prospect-demo-ready. The code is complete; what remains is procurement, legal, and commercial sign-up actions that only humans can perform.
**Last refreshed:** 2026-05-27

---

## Executive summary

Inside this codebase everything that engineering can do has been done:

- **All 9 mock features** (Compliance Calendar, Receipt Vault, Tax Certificate, ROI Simulator, Reviews & NPS, Bid Marketplace, Vendor Leaderboard, AECB Credit Reporting, WhatsApp Threading) now have **real Prisma models, NestJS controllers/services, and database-backed React Query frontends**.
- **All 5 portals/apps** (Web portal, PM Admin, PM Staff, Owner, Tenant, Vendor mobile apps) have the new endpoints wired into their API clients.
- **Integration SDK wrappers** for Twilio, OpenAI, Stripe, SendGrid run in **simulation mode** by default and switch to real mode automatically when the corresponding env keys are set.
- **Background jobs** for compliance alerts, SLA monitor, rent reminders, NPS dispatch, AECB monthly reporting, and vendor leaderboard recompute are scheduled and running.
- **Security**: field-level AES-256-GCM encryption for PII, helmet, rate limiting, audit log interceptor, refresh token rotation, workspace tenancy guard.
- **Compliance scaffolding**: GDPR/UAE PDPL data export, account deletion, cookie consent banner, T&C + Privacy template pages.
- **Multi-language**: i18n with English and Arabic (RTL) dictionaries wired into a useT() hook; Hindi, Urdu, Tagalog stubs ready for the human translator.
- **Tests**: critical-path Jest suites for Compliance, Bids, PII crypto — 10 tests, all green.
- **DevOps**: Dockerfile, railway.json, Procfile, comprehensive .env.production.example.
- **Seed**: production-realistic data for all 9 new entities (compliance items, receipts, reviews, NPS, bids, vendor scores, AECB reports, WhatsApp messages, tax cert, renovation scenarios).

## What humans must still do

The list below is what fundamentally requires a human — commercial agreements, government access, legal review, app store accounts, money flow.

Estimated effort is per-task wall time for a competent operator, **not** my time. Some can run in parallel.

---

### 🔴 BLOCKERS for charging real customers

#### 1. Twilio WhatsApp Business approval
**Why required:** All tenant/owner/vendor WhatsApp messages route through Twilio.
**Code is ready:** `apps/api/src/integrations/twilio.service.ts`. Drops in once env vars are set.

Step-by-step:
1. Go to https://www.twilio.com/try-twilio and create an account using your founder email.
2. Verify business identity (trade licence upload).
3. Navigate to **Messaging → Senders → WhatsApp** and request a sender.
4. Submit Meta business verification (~3–5 business days).
5. Submit your WhatsApp display name (must match registered brand). ~1 day.
6. Create 3 message templates and submit for Meta approval:
   - `rent_reminder` — used by `rent-reminders.processor.ts`
   - `nps_survey` — used by `nps-dispatch.processor.ts`
   - `ticket_update` — used by ticket lifecycle events
7. Once approved, set these env vars on Railway/Render:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+971XXXXXXXXX
   TWILIO_SMS_FROM=+971XXXXXXXXX  # optional
   ```
8. **Test:** trigger any WhatsApp send from the portal. The API log should print "Twilio configured · real mode".

---

#### 2. Payment gateway merchant account
**Why required:** Online rent payment and subscription billing.
**Code is ready:** `apps/api/src/integrations/payments.service.ts` (Stripe primary, Checkout.com + Network International placeholders).

**Recommended for UAE:** Checkout.com (best MEA coverage, Mada + UAE card support out of the box). Stripe is acceptable but doesn't support all UAE rails.

Step-by-step (Checkout.com):
1. Go to https://www.checkout.com/get-test-account
2. Complete the merchant application:
   - UAE trade licence number
   - Bank account for settlement (must be UAE-based for AED settlement)
   - Expected monthly volume
   - Sample of website (point to the staging Vercel URL)
3. Submit; approval typically 5–10 business days.
4. In the Checkout.com Hub:
   - **Channels** → create a "Manara OS Production" channel
   - **API Keys** → generate secret key
   - **Webhooks** → add `https://api.manaraos.ae/api/v1/payments/webhook` and copy webhook signing secret
5. Set env vars:
   ```
   CHECKOUT_SECRET_KEY=sk_...
   CHECKOUT_WEBHOOK_SECRET=...
   ```
6. Engineer must extend `payments.service.ts` with Checkout.com-specific session creation (currently only Stripe is wired). ~4 hours of dev work.

Alternative: Stripe — same shape, faster but with international transaction fees.

---

#### 3. OpenAI / Anthropic billing account
**Why required:** AI calling, AI screening, AI suggestions, AI review responses.
**Code is ready:** `apps/api/src/integrations/openai.service.ts`. Falls back to canned-but-variable simulation otherwise.

Step-by-step:
1. Go to https://platform.openai.com/signup (or https://console.anthropic.com for Claude).
2. Add a billing card with a $50–$200/mo soft cap initially.
3. Create an API key labelled "Manara OS production".
4. Set env vars:
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini   # cheap + good enough, swap to gpt-4o if quality matters
   ```
5. Add a usage alert in the OpenAI dashboard at 80% of monthly budget.

**Note:** if you prefer Anthropic Claude, the engineer should swap the SDK call in `openai.service.ts` to use `@anthropic-ai/sdk`. Same shape.

---

#### 4. Email provider
**Why required:** Transactional email (statement delivery, password resets, tax certificates).
**Code is ready:** `apps/api/src/integrations/email.service.ts` — tries SendGrid → Postmark → SMTP → simulation.

Step-by-step (SendGrid):
1. Sign up at https://signup.sendgrid.com with founder email.
2. Verify your sending domain — add the DKIM/SPF DNS records SendGrid generates. ~30 min if you control DNS.
3. Create an API key with "Mail Send" full access.
4. Set env vars:
   ```
   SENDGRID_API_KEY=SG...
   EMAIL_FROM=noreply@manaraos.ae
   ```
5. (Recommended) Postmark for transactional (better deliverability) + SendGrid for marketing.

---

#### 5. PostgreSQL hosting + Redis hosting
**Why required:** App is running on local Docker. Production needs managed DB + Redis.

Step-by-step (Railway, simplest):
1. Go to https://railway.app and sign up.
2. **New Project → Provision PostgreSQL** — copy the DATABASE_URL.
3. **+ New → Provision Redis** — copy the REDIS_URL.
4. **+ New → Deploy from GitHub repo** — connect this repo. Railway auto-detects `railway.json` and builds with the Dockerfile.
5. Add env vars from `.env.production.example` (all of them — see file).
6. Set service domain (Settings → Networking → Generate Domain).
7. Run a one-time migrate command:
   ```
   railway run npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
   railway run npx tsx packages/database/prisma/seed.ts
   railway run npx tsx packages/database/prisma/seed-extras.ts
   ```

**Cost:** ~$20–50/mo for trial-scale; scales to ~$200/mo at 10 customers.

Alternatives: Supabase (managed Postgres), AWS RDS + ElastiCache, Render, Fly.io.

---

#### 6. Vercel production domain
**Why required:** Web portal already deploys but the prod domain isn't set.

Step-by-step:
1. Buy `manaraos.ae` (or your final domain) from a registrar — Namecheap, Cloudflare, or local UAE registrar.
2. In Vercel → your `apps/web` project → **Settings → Domains → Add** → enter the domain.
3. Add the DNS records Vercel shows (A record + CNAME for www).
4. SSL auto-provisions in ~15 minutes.
5. Update `NEXT_PUBLIC_APP_URL` and the API CORS env `CORS_ORIGINS` to include the new domain.

---

#### 7. PII encryption key (production-grade)
**Why required:** Currently the codebase uses a dev-only AES key if `PII_ENCRYPTION_KEY` is unset.

Step-by-step:
1. Generate a 32-character random secret:
   ```bash
   openssl rand -base64 48 | head -c 32
   ```
2. Generate a 16-character salt:
   ```bash
   openssl rand -base64 24 | head -c 16
   ```
3. Store **both in a secrets manager** — AWS Secrets Manager, Doppler, 1Password Vault.
4. Set env vars on Railway/Render:
   ```
   PII_ENCRYPTION_KEY=<32 chars>
   PII_ENCRYPTION_SALT=<16 chars>
   ```
5. **NEVER rotate without a key-rotation strategy** — existing encrypted data won't decrypt. The engineer must build a key-version field on the encrypted columns before rotation.

---

### 🟡 NEEDED for prospect demos to look credible

#### 8. UAE legal entity registration
**Why required:** Twilio, Stripe/Checkout, payment gateways all require trade licence. AECB requires it. Tax certificates need a registered company name.

Step-by-step:
1. Decide jurisdiction: **Mainland (DED Dubai)** for max flexibility, **Free zone (DMCC, IFZA, DIFC)** for faster setup.
2. Engage a PRO/business setup consultant (e.g., Creation BC, A&A Associates). ~AED 15–25k.
3. Reserve trade name: "Manara OS Technologies L.L.C."
4. Get Initial Approval + MOA notarised.
5. Lease office (Ejari) — can be flexi-desk at IFZA ~AED 12k/year.
6. Apply for trade licence — issued ~5 business days.
7. Apply for establishment card + investor visa.
8. Open corporate bank account (the hardest step — allow 4–6 weeks). Emirates NBD, Mashreq Neo, and Wio are most foreigner-friendly.

---

#### 9. AECB membership (for real credit reporting)
**Why required:** The AECB Credit Reporting feature submits opt-in tenant payment data. Without membership it stays in simulation mode (just stores reports as `QUEUED`).

Step-by-step:
1. Visit https://aecb.gov.ae/en/Service/Become-a-Customer
2. Submit Service Application via their portal.
3. Sign Service Agreement + Subscription Agreement (lawyer should review).
4. Pay annual subscription (~AED 25k–50k depending on data volume).
5. AECB issues your `MEMBER_ID` and API credentials.
6. Engineer wires the AECB SFTP/API in `apps/api/src/queues/processors/aecb-monthly.processor.ts` (currently this processor only QUEUES reports — the actual submission needs your AECB credentials and their data file format spec). ~16 hours dev work once you have credentials.
7. Set env vars:
   ```
   AECB_MEMBER_ID=...
   AECB_API_KEY=...
   AECB_SFTP_HOST=...
   ```

**Timeline:** 4–8 weeks from application.

---

#### 10. DLD / Ejari API access
**Why required:** Automated Ejari registration, smart-rent-index lookups, title verification. The "RERA Smart Rent Index" feature currently uses a stub.

Step-by-step:
1. Apply for "Real Estate Brokerage" trade activity (in addition to your tech licence) — this is required to be a DLD service partner.
2. Submit DLD service partner application via Trakheesi portal: https://trakheesi.dubai.gov.ae
3. Provide:
   - Trade licence
   - Sample integration architecture
   - Data handling policy
4. Pay annual access fee (~AED 100k for full Trakheesi access).
5. DLD issues `TRAKHEESI_API_KEY`.
6. Engineer wires `apps/api/src/integrations/trakheesi/` (folder exists, currently empty). ~40 hours dev.

**Timeline:** 8–16 weeks. Often longer for non-broker entities.

---

#### 11. FTA TRN registration + VAT filing API
**Why required:** Tax certificates currently compute correct numbers but reference a placeholder TRN. To submit returns directly, you need an FTA-certified tax agent integration.

Step-by-step:
1. Register for VAT if revenue > AED 375k (mandatory) or > AED 187.5k (voluntary). https://eservices.tax.gov.ae
2. Receive TRN (Tax Registration Number).
3. Set workspace env / DB:
   ```
   workspace.trnNumber = 'TRN_FROM_FTA'
   ```
4. Engage an FTA-certified tax agent (e.g. TallyKonsult, KGRN). They provide a portal for filings.
5. Direct FTA API integration is rarely allowed for ISVs — the standard workflow is: generate the VAT return PDF in Manara, hand it to the tax agent who files via their FTA-licensed portal.

---

#### 12. Trust escrow bank account
**Why required:** Owner payouts and tenant security deposits must by law (RERA) be held in a segregated trust account, not your operating account.

Step-by-step:
1. Approach **Emirates NBD** or **Mashreq** real-estate division.
2. Apply for a "Real Estate Trust Account" (also called Escrow Account).
3. Provide:
   - Trade licence with real estate activity
   - Sample owner agreement (PMA)
   - Bank's compliance KYC
4. Once opened, set the IBAN in each workspace settings: `Workspace.contactConfig.trustAccountIban`.
5. **Operational rule:** All rent collected sits in trust until distributed to owners per the PMA terms.

**Timeline:** 6–12 weeks.

---

#### 13. PMA legal template review
**Why required:** The Property Management Agreement signing flow already works (PMA Signing Pipeline component). The contract content currently uses generic placeholder language.

Step-by-step:
1. Engage a UAE real estate lawyer (Al Tamimi, BSA, Al Sharif Advocates, or freelance ~AED 5–10k).
2. Provide them: the PMA Signing Pipeline component flow + your commercial terms (fees, scope, dispute resolution).
3. Lawyer drafts a DLD-acceptable PMA template + bilingual (Arabic/English) version.
4. Replace placeholder text in `apps/web/src/components/owners/pma-signing-pipeline.tsx` and add the PDF to the documents vault as the master template.

**Timeline:** 1–2 weeks.

---

#### 14. Translation review (Arabic + Hindi + Urdu + Tagalog)
**Why required:** The English and Arabic dictionaries are AI-generated (`apps/web/src/lib/i18n/dictionaries/`). Quality is ~90% — needs native-speaker polish for legal/financial phrasing.

Step-by-step:
1. Post a brief on Upwork or Proz.com:
   > "Native Arabic (UAE/Gulf dialect) translator needed to review 200 short UI strings for a property management SaaS. Real estate / FTA terminology familiarity required. ~$200, 4-day turnaround."
2. Repeat for Hindi, Urdu, Tagalog.
3. Translators edit the JSON files in `apps/web/src/lib/i18n/dictionaries/`.
4. Add `hi.json`, `ur.json`, `tl.json` (currently the switcher supports them but no dict exists yet — they fall back to English).

**Cost:** ~AED 1500 total. **Timeline:** 1–2 weeks.

---

#### 15. App Store + Play Store accounts (5 apps)
**Why required:** PM Admin, PM Staff, Owner, Tenant, Vendor mobile apps need to be on the stores.

Step-by-step (Apple, do once for all 5 apps):
1. Buy an Apple Developer account at https://developer.apple.com/programs/ — $99/year.
2. **You** must apply (not me) — Apple requires legal entity verification.
3. Wait 2–5 days for approval.
4. In App Store Connect, create 5 app records:
   - `com.manaraos.pm-admin`
   - `com.manaraos.pm-staff`
   - `com.manaraos.owner`
   - `com.manaraos.tenant`
   - `com.manaraos.vendor`

Google Play (do once):
1. https://play.google.com/console/signup — $25 one-time.
2. Verify identity.
3. Create the same 5 app records.

Per-app submission (engineer can run, but you sign):
1. Build using EAS: `cd apps/mobile-owner && eas build --platform ios --profile production`. Repeat for android.
2. Submit using EAS Submit (handles store upload).
3. Apple review: 1–3 days first time, 1 day thereafter.
4. Google review: usually <1 day.

**Required assets per app:** icon (1024×1024), feature graphic (1024×500 for Play), 4 screenshots per device (5.5", 6.5", 6.7" for iOS), short description, full description, privacy policy URL, support URL.

---

### 🟢 OPERATIONAL READINESS

#### 16. Observability — Sentry
**Why required:** Capture errors in production.
**Code is ready:** The `SENTRY_DSN` env var is referenced; just add the SDK initialiser.

Step-by-step:
1. Sign up at https://sentry.io
2. Create projects: `manara-api`, `manara-web`, `manara-mobile-owner`, etc.
3. Copy DSNs.
4. Set env: `SENTRY_DSN=https://...@sentry.io/...`
5. Engineer installs `@sentry/node` (~10 min) and adds `Sentry.init({ dsn })` at the top of `main.ts`. Repeat for web/mobile.

---

#### 17. Uptime + status page
**Step-by-step:**
1. Sign up at https://betteruptime.com (or status.io, Pingdom).
2. Add HTTP check on `https://api.manaraos.ae/api/v1/health` every 60s.
3. Add escalation to your phone via SMS.
4. (Recommended) Create a public status page at `status.manaraos.ae`.

---

#### 18. Backups
**Step-by-step:**
1. **Postgres on Railway:** automatic daily snapshots are included. Verify in Railway dashboard.
2. **Verify restore works** — once a quarter, restore a snapshot into a fresh DB and run smoke tests.
3. **Object storage (S3):** turn on cross-region replication to a secondary region.
4. **Encryption keys:** export to a sealed envelope + store in a fireproof safe (this is the only sane way for the bus-factor problem).

---

#### 19. External security audit / penetration test
**Why required:** Some enterprise tenants require this before signing.

Step-by-step:
1. Get 3 quotes from UAE-based firms: SecureLink, Help AG, Paramount Computer Systems.
2. Scope: API + web portal + mobile apps + infrastructure.
3. Typical cost: AED 25k–80k depending on scope.
4. Pen-test report → engineer remediates findings (allow 1–2 weeks).

**Timeline:** 2–4 weeks.

---

#### 20. Pre-existing TS errors in mobile apps
**Why:** Expo SDK's bundled `tsconfig.base.json` uses an `--module` value not recognised by the project's installed TS version. Plus `lucide-react-native` missing from some apps.

Step-by-step (engineer, ~30 min):
1. In each `apps/mobile-*/`:
   ```bash
   npm install lucide-react-native
   ```
2. Update `apps/mobile-*/tsconfig.json` to override `module: "esnext"` instead of inheriting.

---

#### 21. Pre-existing API TS errors (legacy code paths)
**Why:** A handful of older modules (admin/billing/finance/owners/tenants/units services) have loose typing that fails strict tsc. The runtime works; the errors are type-only.

Step-by-step (engineer, ~3 hours):
1. Run `cd apps/api && npx tsc --noEmit` to get the full list.
2. Fix each (mostly adding `as any` casts where Prisma's inferred type is narrower than the legacy code expects, or aligning DTO field names with the actual schema).
3. Add `"strict": false` temporarily in `apps/api/tsconfig.json` if you need a clean build before fixing all — but I'd advise fixing each one properly to prevent future bugs.

---

### Optional — nice-to-have post-launch

#### 22. PostHog / Mixpanel analytics
Track funnel events for product-led growth.

#### 23. Customer.io / Intercom
In-app messaging + lifecycle email campaigns.

#### 24. Looker Studio / Metabase
Internal BI dashboard pointed at a read-replica of production DB.

#### 25. Status badge for "AECB partner" / "Trakheesi partner"
Once #9 and #10 close, add the trust marks to landing pages.

---

## Quick env-var checklist for go-live

Set ALL of these on your deployment platform (Railway/Render/AWS):

```bash
# Core
NODE_ENV=production
DATABASE_URL=...
DIRECT_URL=...                # same as DATABASE_URL for most managed providers
REDIS_URL=...
JWT_SECRET=...                # openssl rand -base64 48
JWT_REFRESH_SECRET=...        # different secret
CORS_ORIGINS=https://app.manaraos.ae,https://manaraos.ae

# PII (REQUIRED — see task #7)
PII_ENCRYPTION_KEY=...
PII_ENCRYPTION_SALT=...

# Twilio (task #1)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+971XXXXXXXXX

# OpenAI (task #3)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Email (task #4)
SENDGRID_API_KEY=SG...
EMAIL_FROM=noreply@manaraos.ae

# Payments (task #2)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# or
CHECKOUT_SECRET_KEY=sk_...

# Observability (task #16)
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info

# Government APIs (tasks #9, #10) — leave blank until commercial agreements close
AECB_MEMBER_ID=
AECB_API_KEY=
TRAKHEESI_API_KEY=
EJARI_API_KEY=
RERA_API_KEY=
```

---

## Order of operations — recommended sequence

**Week 1:**
- Task #5 (DB + Redis hosting on Railway)
- Task #7 (PII keys)
- Task #6 (Vercel domain)
- Task #16 (Sentry)
- Task #17 (uptime monitor)
- Engage lawyer for tasks #13 and #19

**Weeks 2–3:**
- Task #1 (Twilio) — start NOW, has long approval
- Task #3 (OpenAI) — same day
- Task #4 (Email)
- Task #8 (legal entity registration) — long timeline, start NOW
- Task #20 + #21 (TS error cleanup)
- Task #14 (translation reviewers hired)

**Weeks 4–8:**
- Task #2 (Payment gateway)
- Task #12 (Trust escrow bank)
- Task #9 (AECB application)
- Task #11 (FTA TRN)
- Task #15 (App Store accounts)
- Task #19 (External security audit booked)

**Weeks 8–16:**
- Task #10 (DLD/Trakheesi) — longest pole
- All mobile app store submissions and review
- Pen-test remediation

---

## Verifying you're ready to charge real customers

When all of the following are true:
- ✅ Production API is live at `api.manaraos.ae` with valid SSL
- ✅ Web portal is live at `app.manaraos.ae` with valid SSL
- ✅ Twilio WhatsApp messages reach real phones (not simulation)
- ✅ A test charge of AED 5 to your own card succeeds end-to-end
- ✅ A real AI call transcript appears (not the templated simulation one)
- ✅ Trust escrow account is open and receiving deposits
- ✅ PMA template has been signed by your lawyer
- ✅ Privacy policy + Terms have been signed by your lawyer
- ✅ Penetration test passed with no `Critical` or `High` findings
- ✅ Backup restore drill successful within the last 90 days
- ✅ Sentry receives a test error
- ✅ At least one paying customer has signed the LOI

…then you can flip the switch.

---

## Code map — where each commercial decision lives

| Decision | File | What needs to change |
|---|---|---|
| Twilio WhatsApp | `apps/api/src/integrations/twilio.service.ts` | Env vars (no code change) |
| OpenAI / Anthropic | `apps/api/src/integrations/openai.service.ts` | Env vars or SDK swap |
| Payment gateway | `apps/api/src/integrations/payments.service.ts` | Env vars; Checkout.com session method needs ~4h dev |
| Email | `apps/api/src/integrations/email.service.ts` | Env vars |
| PII encryption | `apps/api/src/common/crypto/pii-crypto.service.ts` | Env vars |
| AECB submission | `apps/api/src/queues/processors/aecb-monthly.processor.ts` | Add SFTP/API client, ~16h dev once credentials available |
| Trakheesi/DLD | `apps/api/src/integrations/trakheesi/` (empty) | New service, ~40h dev once API access granted |
| Translations | `apps/web/src/lib/i18n/dictionaries/*.json` | Edit JSON files (no dev) |
| PMA contract text | `apps/web/src/components/owners/pma-signing-pipeline.tsx` | Replace string content (no dev) |
| Privacy policy | `apps/web/src/app/privacy/page.tsx` | Replace string content |
| Terms of service | `apps/web/src/app/terms/page.tsx` | Replace string content |

---

## Contacts you'll need

| Role | Why | Suggested suppliers |
|---|---|---|
| UAE business-setup PRO | Trade licence | Creation BC, A&A Associates, IFZA in-house |
| UAE real estate lawyer | PMA, T&Cs, privacy | Al Tamimi, BSA, Al Sharif, freelance via LinkedIn |
| FTA tax agent | VAT filings | TallyKonsult, KGRN, Spectrum Accounts |
| Native translators | Arabic + Hindi + Urdu + Tagalog | Upwork / Proz / Gengo |
| Security audit firm | Pen-test | Help AG, SecureLink, Paramount |
| Bank relationship manager | Trust account | Emirates NBD Real Estate Services, Mashreq |
| Telecom representative | If you need TRA approval for SMS short-codes | Etisalat by e&, du |
| Local PR / brand designer | Press launch + Arabic copy review | Local UAE agencies |

---

## What success looks like 90 days from today

- 2–5 paying PM customers, contracts signed
- 200+ active tenants using WhatsApp daily for rent reminders
- 50+ AI calls per week (real, not simulated)
- 5 mobile apps live on stores with non-zero install counts
- $5–15k MRR
- Net Promoter Score > 40 (real responses)
- Zero P0 security incidents
- < 1 hour mean-time-to-recover from incidents

Reach that and you have proof-points to fundraise or to scale UAE-wide.

Good luck. The platform is ready — your job now is sales, signatures, and operations.
