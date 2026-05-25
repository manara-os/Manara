# Manara OS — Production Deployment Guide

## Prerequisites

- Kubernetes cluster (1.28+) with nginx-ingress and cert-manager
- PostgreSQL 16 (managed, e.g., AWS RDS or Supabase)
- Redis 7 (managed, e.g., Upstash or AWS ElastiCache)
- Container registry (registry.manaraos.ae or GHCR)
- Domain `manaraos.ae` with DNS control
- EAS account for mobile builds

---

## Step 1: Infrastructure Setup

### DNS Records

```
A    api.manaraos.ae        → <load-balancer-ip>
A    app.manaraos.ae        → <load-balancer-ip>
A    *.manaraos.ae          → <load-balancer-ip>
```

### cert-manager ClusterIssuer

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@manaraos.ae
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

---

## Step 2: Create Kubernetes Secrets

```bash
kubectl create namespace manara

# API secrets
kubectl create secret generic manara-api-secrets \
  --namespace manara \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_SECRET="<min-32-char-secret>" \
  --from-literal=JWT_REFRESH_SECRET="<min-32-char-secret>" \
  --from-literal=TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxx" \
  --from-literal=TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxx" \
  --from-literal=TWILIO_FROM_NUMBER="+971xxxxxxxxx" \
  --from-literal=TWILIO_WHATSAPP_FROM="whatsapp:+971xxxxxxxxx" \
  --from-literal=OPENAI_API_KEY="sk-..." \
  --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_..." \
  --from-literal=AWS_ACCESS_KEY_ID="AKIA..." \
  --from-literal=AWS_SECRET_ACCESS_KEY="..." \
  --from-literal=AWS_S3_BUCKET="manara-documents-prod" \
  --from-literal=AWS_REGION="me-south-1" \
  --from-literal=SENTRY_DSN="https://..." \
  --from-literal=FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Web secrets
kubectl create secret generic manara-web-secrets \
  --namespace manara \
  --from-literal=NEXTAUTH_SECRET="<min-32-char-secret>"

# Container registry credentials
kubectl create secret docker-registry registry-credentials \
  --namespace manara \
  --docker-server=registry.manaraos.ae \
  --docker-username=<username> \
  --docker-password=<password>
```

---

## Step 3: Database Migration

Run migrations before deploying (as a Kubernetes Job):

```bash
kubectl run prisma-migrate \
  --image=registry.manaraos.ae/manara-api:latest \
  --restart=Never \
  --namespace=manara \
  --env-file=.env.production \
  --command -- node -e "const { execSync } = require('child_process'); execSync('npx prisma migrate deploy', { stdio: 'inherit' })"

# Seed demo data (first deploy only)
kubectl run prisma-seed \
  --image=registry.manaraos.ae/manara-api:latest \
  --restart=Never \
  --namespace=manara \
  --env-file=.env.production \
  --command -- node -e "const { execSync } = require('child_process'); execSync('npx prisma db seed', { stdio: 'inherit' })"
```

---

## Step 4: Deploy Application

### Build and push images

```bash
export IMAGE_TAG=$(git rev-parse --short HEAD)

# Build API
docker build -f apps/api/Dockerfile -t registry.manaraos.ae/manara-api:$IMAGE_TAG .
docker push registry.manaraos.ae/manara-api:$IMAGE_TAG

# Build Web
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.manaraos.ae/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.manaraos.ae \
  -t registry.manaraos.ae/manara-web:$IMAGE_TAG .
docker push registry.manaraos.ae/manara-web:$IMAGE_TAG
```

### Deploy to Kubernetes

```bash
cd infrastructure/kubernetes/overlays/production
IMAGE_TAG=$IMAGE_TAG kustomize build . | kubectl apply -f -

# Monitor rollout
kubectl rollout status deployment/manara-api -n manara --timeout=600s
kubectl rollout status deployment/manara-web -n manara --timeout=600s
```

---

## Step 5: Stripe Configuration

1. In Stripe Dashboard, create Products:
   - **Starter**: AED 299/mo — up to 50 units
   - **Growth**: AED 699/mo — up to 200 units
   - **Enterprise**: Custom pricing

2. Set webhook endpoint: `https://api.manaraos.ae/api/v1/billing/webhook`

3. Enable events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

---

## Step 6: Mobile App Builds

### Configure EAS

```bash
# Vendor app
cd apps/mobile-vendor
eas build --platform all --profile production

# Tenant app
cd apps/mobile-tenant
eas build --platform all --profile production

# Owner app
cd apps/mobile-owner
eas build --platform all --profile production
```

### Submit to stores

```bash
eas submit --platform ios
eas submit --platform android
```

---

## Step 7: Ejari Integration (Production)

1. Register for DLD API access at developer.dubailand.gov.ae
2. Set environment variables:
   ```
   EJARI_API_URL=https://api.dubailand.gov.ae/ejari/v1
   EJARI_API_KEY=<your-api-key>
   EJARI_MOCK_MODE=false
   ```
3. Test with a staging lease before production go-live

---

## Step 8: Monitoring Setup

### Sentry

```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### Health Checks

- API health: `https://api.manaraos.ae/health`
- Web health: `https://app.manaraos.ae/api/health`

---

## Rollback Procedure

```bash
# Roll back to previous deployment
kubectl rollout undo deployment/manara-api -n manara
kubectl rollout undo deployment/manara-web -n manara

# Roll back to specific revision
kubectl rollout undo deployment/manara-api -n manara --to-revision=2
```

---

## Scaling

```bash
# Manual scale
kubectl scale deployment/manara-api --replicas=5 -n manara

# HPA is already configured for auto-scaling:
# API: 2-10 replicas, CPU 70% / Memory 80%
# Web: 2-6 replicas, CPU 70%
```

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars |
| `TWILIO_ACCOUNT_SID` | Prod | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Prod | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Prod | UAE number for SMS/calls |
| `TWILIO_WHATSAPP_FROM` | Prod | WhatsApp-enabled number |
| `OPENAI_API_KEY` | Prod | OpenAI for AI rent calls |
| `STRIPE_SECRET_KEY` | Prod | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Prod | Stripe webhook signing secret |
| `AWS_ACCESS_KEY_ID` | Prod | S3-compatible storage |
| `AWS_SECRET_ACCESS_KEY` | Prod | S3-compatible storage |
| `AWS_S3_BUCKET` | Prod | Bucket name |
| `AWS_REGION` | Prod | e.g., `me-south-1` (Bahrain) |
| `EJARI_API_URL` | Prod | DLD API URL |
| `EJARI_API_KEY` | Prod | DLD API key |
| `EJARI_MOCK_MODE` | No | `true` in dev/staging |
| `SENTRY_DSN` | Prod | Error tracking |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Prod | FCM for tenant push |
