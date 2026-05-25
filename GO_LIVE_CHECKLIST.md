# Manara OS — Go-Live Checklist

## Pre-Launch Checklist

### Infrastructure
- [ ] PostgreSQL 16 production instance provisioned (RDS Multi-AZ or managed)
- [ ] Redis 7 production instance provisioned (Upstash or ElastiCache)
- [ ] Kubernetes cluster ready (DigitalOcean DOKS or AWS EKS)
- [ ] Container registry set up (registry.manaraos.ae)
- [ ] SSL certificates issued (cert-manager + Let's Encrypt)
- [ ] DNS records configured for api.manaraos.ae and app.manaraos.ae
- [ ] Wildcard DNS `*.manaraos.ae` configured for workspace subdomains

### Security
- [ ] JWT_SECRET generated (min 64 chars, cryptographically random)
- [ ] JWT_REFRESH_SECRET generated (min 64 chars, different from JWT_SECRET)
- [ ] All Kubernetes secrets created (kubectl create secret)
- [ ] CORS origins locked down (no wildcard in production)
- [ ] Rate limiting enabled and configured
- [ ] Helmet security headers enabled
- [ ] Database connection over SSL (sslmode=require)
- [ ] S3 bucket policies configured (private, no public access)

### Integrations
- [ ] Twilio account verified and phone number activated
- [ ] WhatsApp Business API configured (Twilio sandbox or approved business account)
- [ ] OpenAI API key with GPT-4o access
- [ ] Stripe account in live mode (not test)
- [ ] Stripe products created (Starter, Growth, Enterprise)
- [ ] Stripe webhook endpoint registered and verified
- [ ] AWS/Wasabi S3 bucket created in `me-south-1` region
- [ ] Firebase project created, FCM enabled, service account downloaded
- [ ] Ejari DLD API credentials obtained (contact developer.dubailand.gov.ae)
- [ ] RERA Smart Rental Index API access configured
- [ ] Sentry project created, DSN configured

### Database
- [ ] `prisma migrate deploy` run on production database
- [ ] `prisma db seed` run (creates demo workspace + users)
- [ ] Backup schedule configured (daily automated snapshots)
- [ ] Point-in-time recovery enabled (for RDS: minimum 7 days)
- [ ] Database connection pooling configured (PgBouncer or Prisma connection pool)
- [ ] Indexes verified (`prisma migrate status` shows clean state)

### Application
- [ ] All environment variables set (compare against .env.example)
- [ ] `EJARI_MOCK_MODE=false` in production
- [ ] `NODE_ENV=production` in all services
- [ ] Health checks passing (`/health` returns 200)
- [ ] API Swagger docs accessible at `/api/docs` (restrict to internal IPs)
- [ ] Worker process deployed and processing queues

### Mobile Apps
- [ ] EAS build completed for all 3 apps (iOS + Android)
- [ ] App Store Connect listing created (Owner, Tenant, Vendor)
- [ ] Google Play Console listing created (Owner, Tenant, Vendor)
- [ ] TestFlight / Internal Testing configured
- [ ] Push notification certificates uploaded to EAS
- [ ] Production API URL configured in app.json (apiUrl: "https://api.manaraos.ae/api/v1")
- [ ] Expo OTA updates configured (channel: production)

### Frontend
- [ ] Next.js production build successful (`next build`)
- [ ] `NEXT_PUBLIC_API_URL` pointing to production API
- [ ] Vercel project linked and environment variables set
- [ ] Custom domain `app.manaraos.ae` configured in Vercel
- [ ] `next.config.js` has correct `output: 'standalone'` for Docker builds

### Monitoring
- [ ] Sentry alerts configured (error threshold, performance)
- [ ] PostHog analytics snippet added to web app
- [ ] Kubernetes resource limits set (prevent runaway pods)
- [ ] HPA configured (auto-scale on CPU/memory)
- [ ] PodDisruptionBudget applied (zero-downtime rolling updates)
- [ ] Uptime monitoring configured (Uptime Robot or Better Uptime)
- [ ] On-call rotation set up

### Testing
- [ ] `pnpm test --coverage` passing (>70% coverage)
- [ ] Smoke test: Login with OTP → Dashboard → Create ticket → Assign vendor
- [ ] Smoke test: Stripe checkout → subscription activated
- [ ] Smoke test: Push notification received on mobile device
- [ ] Smoke test: Ejari mock registration returns expected response
- [ ] Load test: 50 concurrent users on API (use k6 or Locust)

---

## Launch Day Sequence

1. **T-24h**: Run final database migration on production
2. **T-12h**: Deploy API and Worker to production cluster
3. **T-12h**: Deploy Web frontend to Vercel
4. **T-6h**: Internal smoke testing by team
5. **T-2h**: Enable Stripe live mode, confirm webhooks firing
6. **T-1h**: Submit mobile apps to TestFlight for final review
7. **T-0**: Go live! Announce to first workspace customers
8. **T+1h**: Monitor Sentry for errors, check health endpoints
9. **T+24h**: Review first day metrics in PostHog

---

## Post-Launch

- [ ] First paying customer onboarded
- [ ] Support Slack channel created for PM customers
- [ ] Runbook written for common ops (add workspace, reset user, clear failed queue jobs)
- [ ] Disaster recovery drill scheduled (within 30 days)
- [ ] Penetration test scheduled (within 90 days)
- [ ] SOC2 readiness assessment (if targeting enterprise clients)

---

## Cost Estimate (Monthly at Launch)

| Service | Plan | Est. Cost |
|---------|------|-----------|
| Kubernetes (DigitalOcean) | 3x 4GB nodes | ~$72/mo |
| PostgreSQL (DigitalOcean Managed) | 1 primary + standby | ~$50/mo |
| Redis (Upstash) | Pro 1GB | ~$20/mo |
| Container Registry | Standard | ~$5/mo |
| Vercel | Pro | ~$20/mo |
| Twilio (OTP+SMS) | Pay-per-use | ~$30/mo |
| OpenAI | GPT-4o API calls | ~$50/mo |
| Stripe | 0.5% on payouts | Variable |
| Sentry | Developer | Free |
| AWS S3 (Wasabi) | 1TB storage | ~$7/mo |
| Domain + DNS | Cloudflare | ~$15/yr |
| **Total** | | **~$254/mo** |

_Costs scale with usage. First 10 workspaces covered at this tier._

---

## Emergency Contacts

| Service | Action |
|---------|--------|
| API down | `kubectl rollout undo deployment/manara-api -n manara` |
| DB connection issues | Check `DATABASE_URL`, verify PgBouncer, check connection pool limits |
| Queue stuck | `redis-cli FLUSHDB` (dev only!) or clear individual queues via Bull Board |
| Mobile push broken | Verify FCM service account, check Expo push token expiry |
| Stripe webhook failing | Verify `STRIPE_WEBHOOK_SECRET`, check raw body parsing in `main.ts` |
