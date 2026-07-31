-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CountryCode" AS ENUM ('AE', 'IN', 'GB', 'SA', 'QA', 'KW', 'BH', 'OM');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'PM_ADMIN', 'PM_OPS', 'OWNER', 'TENANT', 'VENDOR');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'STUDIO', 'COMMERCIAL', 'COMPOUND', 'TOWNHOUSE', 'PENTHOUSE', 'OFFICE', 'RETAIL', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SOLD', 'UNDER_RENOVATION');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('STUDIO', 'ONE_BR', 'TWO_BR', 'THREE_BR', 'FOUR_BR', 'PENTHOUSE', 'RETAIL', 'OFFICE', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "FurnishingStatus" AS ENUM ('UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED');

-- CreateEnum
CREATE TYPE "KycType" AS ENUM ('UAE_NATIONAL', 'EXPAT_RESIDENT', 'NON_RESIDENT', 'TOURIST', 'CORPORATE');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RENEWED', 'EXPIRED', 'TERMINATED', 'PENDING_EJARI');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'AC_HVAC', 'PEST_CONTROL', 'PAINTING', 'CARPENTRY', 'CLEANING', 'LANDSCAPING', 'APPLIANCE', 'STRUCTURAL', 'SECURITY', 'ELEVATOR', 'POOL', 'GYM', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('PENDING', 'PRESENTED', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED', 'REPLACED');

-- CreateEnum
CREATE TYPE "RentCollectionMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'CASH', 'ONLINE', 'CARD', 'CRYPTO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TITLE_DEED', 'EJARI_CERTIFICATE', 'LEASE_CONTRACT', 'PMA', 'PASSPORT', 'EMIRATES_ID', 'RESIDENCY_VISA', 'TRADE_LICENSE', 'MOA', 'NOC', 'FLOOR_PLAN', 'UTILITY_BILL', 'BANK_STATEMENT', 'SOA', 'RECEIPT', 'INVOICE', 'INSPECTION_REPORT', 'MOVE_IN_CHECKLIST', 'MOVE_OUT_CHECKLIST', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RENT_DUE', 'RENT_OVERDUE', 'RENT_RECEIVED', 'LEASE_RENEWAL', 'LEASE_EXPIRY', 'EJARI_REGISTERED', 'EJARI_EXPIRY', 'PMA_RENEWAL', 'MAINTENANCE_RAISED', 'MAINTENANCE_ASSIGNED', 'MAINTENANCE_COMPLETED', 'VENDOR_ASSIGNMENT', 'DOCUMENT_EXPIRY', 'VACANCY_ALERT', 'PAYMENT_PROCESSED', 'INVOICE_APPROVED', 'KYC_EXPIRY', 'SYSTEM_ALERT', 'OWNER_APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL', 'WHATSAPP', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "AiCallOutcome" AS ENUM ('ANSWERED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED', 'CALLBACK_REQUESTED');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "ListingPortal" AS ENUM ('BAYUT', 'PROPERTY_FINDER', 'DUBIZZLE', 'PROPERTYFINDER', 'HAUS_AND_HAUS', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'SOLD', 'RENTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT', 'PAYMENT', 'APPROVE', 'REJECT', 'ASSIGN', 'PUBLISH');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MoveInStatus" AS ENUM ('PENDING', 'ONGOING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('LEASING', 'SALE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "PmaStatus" AS ENUM ('ACTIVE', 'PENDING_RENEWAL', 'TERMINATED');

-- CreateEnum
CREATE TYPE "MoveOutStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SETTLED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ComplianceCategory" AS ENUM ('TRADE_LICENSE', 'VAT_FILING', 'RERA', 'DLD', 'EJARI', 'INSURANCE', 'STAFF_VISA', 'FIRE_SAFETY', 'CIVIL_DEFENCE', 'AML_KYC', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWAL_IN_PROGRESS', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "TaxCertificateStatus" AS ENUM ('DRAFT', 'GENERATED', 'EMAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('GOOGLE', 'BAYUT', 'PROPERTY_FINDER', 'DUBIZZLE', 'INTERNAL_NPS', 'WHATSAPP', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "NpsStatus" AS ENUM ('PENDING', 'SENT', 'RESPONDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AecbReportStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'RETRY');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppSender" AS ENUM ('TENANT', 'OWNER', 'VENDOR', 'PM', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "WhatsAppDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logo_url" TEXT,
    "primary_color" VARCHAR(7) DEFAULT '#10B981',
    "country_code" "CountryCode" NOT NULL DEFAULT 'AE',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "gst_rate" DECIMAL(5,2),
    "ejari_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rera_code" VARCHAR(50),
    "trn_number" VARCHAR(30),
    "trade_license_no" VARCHAR(50),
    "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMPTZ,
    "stripe_customer_id" TEXT,
    "stripe_sub_id" TEXT,
    "billing_email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "max_properties" INTEGER NOT NULL DEFAULT 10,
    "max_users" INTEGER NOT NULL DEFAULT 5,
    "features" JSONB NOT NULL DEFAULT '{}',
    "country_config" JSONB NOT NULL DEFAULT '{}',
    "contact_phone" VARCHAR(20),
    "contact_email" TEXT,
    "address" TEXT,
    "city" VARCHAR(100),
    "is_white_label" BOOLEAN NOT NULL DEFAULT false,
    "custom_domain" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "full_name" VARCHAR(255),
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_by" UUID,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workspace_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "phone" VARCHAR(20) NOT NULL,
    "code" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "workspace_id" UUID,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(10) NOT NULL,
    "app_variant" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ,
    "device_id" TEXT,
    "app_version" VARCHAR(20),

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "type" "PropertyType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "country_code" "CountryCode" NOT NULL DEFAULT 'AE',
    "city" VARCHAR(100) NOT NULL,
    "area" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "title_deed_no" VARCHAR(100),
    "plot_no" VARCHAR(50),
    "makani_no" VARCHAR(20),
    "dld_permit_no" VARCHAR(100),
    "rera_permit_no" VARCHAR(100),
    "year_built" INTEGER,
    "total_units" INTEGER NOT NULL DEFAULT 1,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "description" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "floor_plan_url" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "developer_name" VARCHAR(255),
    "building_age" INTEGER,
    "service_charge" DECIMAL(10,2),
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "unit_number" VARCHAR(50) NOT NULL,
    "floor" INTEGER,
    "type" "UnitType" NOT NULL DEFAULT 'ONE_BR',
    "area_sqft" DECIMAL(10,2),
    "bedroom_count" INTEGER,
    "bathroom_count" INTEGER,
    "annual_rent" DECIMAL(12,2),
    "occupancy_status" "OccupancyStatus" NOT NULL DEFAULT 'VACANT',
    "furnishing_status" "FurnishingStatus" NOT NULL DEFAULT 'UNFURNISHED',
    "security_deposit_pct" DECIMAL(4,2) NOT NULL DEFAULT 5.00,
    "view" VARCHAR(100),
    "parking_slots" INTEGER NOT NULL DEFAULT 0,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "purchase_price" DECIMAL(12,2),
    "purchase_date" DATE,
    "estimated_value" DECIMAL(12,2),
    "last_valued_at" TIMESTAMPTZ,
    "gross_yield_pct" DECIMAL(5,2),
    "notes" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "nationality" VARCHAR(100),
    "kyc_type" "KycType" NOT NULL DEFAULT 'EXPAT_RESIDENT',
    "passport_no" VARCHAR(50),
    "emirates_id" VARCHAR(20),
    "emirates_id_expiry" DATE,
    "residency_visa_no" VARCHAR(50),
    "residency_visa_expiry" DATE,
    "passport_expiry" DATE,
    "trade_license_no" VARCHAR(50),
    "company_name" VARCHAR(255),
    "bank_iban" VARCHAR(34),
    "bank_name" VARCHAR(100),
    "bank_swift" VARCHAR(11),
    "pma_signed_date" DATE,
    "pma_expiry_date" DATE,
    "mgmt_fee_pct" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "kyc_verified" BOOLEAN NOT NULL DEFAULT false,
    "pma_status" "PmaStatus" NOT NULL DEFAULT 'ACTIVE',
    "pma_renewal_alert_sent_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "nationality" VARCHAR(100),
    "kyc_type" "KycType" NOT NULL DEFAULT 'EXPAT_RESIDENT',
    "passport_no" VARCHAR(50),
    "passport_expiry" DATE,
    "emirates_id" VARCHAR(20),
    "emirates_id_expiry" DATE,
    "residency_visa_no" VARCHAR(50),
    "residency_visa_expiry" DATE,
    "trade_license_no" VARCHAR(50),
    "trade_license_expiry" DATE,
    "company_name" VARCHAR(255),
    "emergency_contact" JSONB NOT NULL DEFAULT '{}',
    "kyc_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyc_verified_at" TIMESTAMPTZ,
    "kyc_verified_by" UUID,
    "screening_status" "ScreeningStatus" NOT NULL DEFAULT 'PENDING',
    "screening_approved_at" TIMESTAMPTZ,
    "screening_approved_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lease_type" "LeaseType" NOT NULL DEFAULT 'RESIDENTIAL',
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "annual_rent" DECIMAL(12,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "payment_frequency" "PaymentFrequency" NOT NULL DEFAULT 'ANNUAL',
    "num_cheques" INTEGER NOT NULL DEFAULT 1,
    "security_deposit" DECIMAL(12,2) NOT NULL,
    "grace_period_days" INTEGER NOT NULL DEFAULT 5,
    "vat_applicable" BOOLEAN NOT NULL DEFAULT false,
    "vat_amount" DECIMAL(10,2),
    "total_with_vat" DECIMAL(12,2),
    "ejari_number" VARCHAR(50),
    "ejari_registered_at" TIMESTAMPTZ,
    "ejari_expiry_date" DATE,
    "ejari_certificate_url" TEXT,
    "ejari_status" VARCHAR(50),
    "contract_url" TEXT,
    "signed_at" TIMESTAMPTZ,
    "signed_by_tenant_at" TIMESTAMPTZ,
    "renewed_from_lease_id" UUID,
    "renewal_offered_at" TIMESTAMPTZ,
    "renewal_accepted_at" TIMESTAMPTZ,
    "terminated_at" TIMESTAMPTZ,
    "termination_reason" TEXT,
    "special_conditions" TEXT,
    "rera_increase_audit" JSONB,
    "lease_ref" VARCHAR(50),
    "screening_approved" BOOLEAN NOT NULL DEFAULT false,
    "move_in_status" "MoveInStatus",
    "move_in_pending_at" TIMESTAMPTZ,
    "move_in_ongoing_at" TIMESTAMPTZ,
    "move_in_completed_at" TIMESTAMPTZ,
    "handover_at" TIMESTAMPTZ,
    "commission_amount" DECIMAL(12,2),
    "commission_status" "CommissionStatus",
    "commission_verified_at" TIMESTAMPTZ,
    "commission_verified_by" UUID,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "type" "CommissionType" NOT NULL DEFAULT 'LEASING',
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ,
    "verified_by" UUID,
    "paid_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "move_out_inspections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "inspected_at" TIMESTAMPTZ,
    "maintenance_required" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_amount" DECIMAL(12,2),
    "settlement_amount" DECIMAL(12,2),
    "utility_bills_submitted" BOOLEAN NOT NULL DEFAULT false,
    "refund_approved" BOOLEAN NOT NULL DEFAULT false,
    "refund_amount" DECIMAL(12,2),
    "refund_issued_at" TIMESTAMPTZ,
    "status" "MoveOutStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "inspected_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "move_out_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewal_alerts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "days_before_expiry" INTEGER NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',

    CONSTRAINT "renewal_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdc_cheques" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "cheque_number" VARCHAR(50) NOT NULL,
    "cheque_seq" INTEGER NOT NULL,
    "bank_name" VARCHAR(100),
    "account_no" VARCHAR(30),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "due_date" DATE NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'PENDING',
    "deposited_at" TIMESTAMPTZ,
    "cleared_at" TIMESTAMPTZ,
    "bounced_at" TIMESTAMPTZ,
    "bounce_reason" TEXT,
    "replaced_by_chq_id" UUID,
    "notes" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pdc_cheques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_collections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "collected_at" TIMESTAMPTZ NOT NULL,
    "method" "RentCollectionMethod" NOT NULL DEFAULT 'CHEQUE',
    "reference_no" VARCHAR(100),
    "pdc_cheque_id" UUID,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "vat_amount" DECIMAL(10,2),
    "receipt_url" TEXT,
    "notes" TEXT,
    "collected_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "property_id" UUID,
    "unit_id" UUID,
    "ticket_id" UUID,
    "vendor_id" UUID,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "vat_amount" DECIMAL(10,2),
    "expense_date" DATE NOT NULL,
    "invoice_url" TEXT,
    "receipt_url" TEXT,
    "notes" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_soas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_revenue" DECIMAL(12,2) NOT NULL,
    "total_expenses" DECIMAL(12,2) NOT NULL,
    "management_fee" DECIMAL(12,2) NOT NULL,
    "vat_amount" DECIMAL(10,2),
    "net_disbursement" DECIMAL(12,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "pdf_url" TEXT,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ,
    "acknowledged_at" TIMESTAMPTZ,
    "line_items" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "owner_soas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "company_name" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(255),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "trade_license_no" VARCHAR(50),
    "trade_license_expiry" DATE,
    "service_categories" "TicketCategory"[],
    "coverage_areas" JSONB NOT NULL DEFAULT '[]',
    "status" "VendorStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "rating" DECIMAL(3,2),
    "total_jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "bank_iban" VARCHAR(34),
    "bank_name" VARCHAR(100),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "notes" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "ticket_ref" VARCHAR(20) NOT NULL,
    "unit_id" UUID NOT NULL,
    "raised_by_tenant_id" UUID,
    "raised_by_user_id" UUID,
    "assigned_vendor_id" UUID,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "scheduled_date" DATE,
    "scheduled_time_slot" VARCHAR(50),
    "completion_photos" JSONB NOT NULL DEFAULT '[]',
    "vendor_notes" TEXT,
    "vendor_invoice_amount" DECIMAL(10,2),
    "vendor_invoice_url" TEXT,
    "invoice_approved_at" TIMESTAMPTZ,
    "invoice_approved_by" UUID,
    "tenant_rating" INTEGER,
    "tenant_feedback" TEXT,
    "sla_hours" INTEGER,
    "sla_due_at" TIMESTAMPTZ,
    "sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMPTZ,
    "accepted_at" TIMESTAMPTZ,
    "in_progress_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "doc_type" "DocumentType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" VARCHAR(100),
    "size_bytes" INTEGER,
    "expiry_date" DATE,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "ocr_data" JSONB,
    "notes" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "tenant_id" UUID,
    "owner_id" UUID,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "read_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "external_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_calls" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lease_id" UUID,
    "call_sid" VARCHAR(50),
    "to_phone" VARCHAR(20) NOT NULL,
    "script" TEXT NOT NULL,
    "initiated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "duration" INTEGER,
    "outcome" "AiCallOutcome",
    "transcript_url" TEXT,
    "transcript" TEXT,
    "initiated_by" UUID,
    "overdue_days" INTEGER,
    "overdue_amount" DECIMAL(12,2),
    "follow_up_action" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_listings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "portal" "ListingPortal" NOT NULL,
    "external_listing_id" VARCHAR(100),
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "listing_url" TEXT,
    "title" VARCHAR(255),
    "asking_rent" DECIMAL(12,2),
    "published_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "views" INTEGER NOT NULL DEFAULT 0,
    "inquiries" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "property_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_index_cache" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "area" VARCHAR(100) NOT NULL,
    "property_type" VARCHAR(50) NOT NULL,
    "bedroom_count" INTEGER,
    "min_rent" DECIMAL(12,2) NOT NULL,
    "max_rent" DECIMAL(12,2) NOT NULL,
    "avg_rent" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'AED',
    "effective_date" DATE NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'RERA',
    "refreshed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rera_index_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "changes" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "request_id" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "stripe_invoice_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "due_date" DATE,
    "invoice_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" CHAR(8) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered" TIMESTAMPTZ,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "category" "ComplianceCategory" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "reference_number" VARCHAR(100),
    "issued_date" DATE,
    "expiry_date" DATE NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'VALID',
    "responsible_user_id" UUID,
    "cost_aed" DECIMAL(10,2),
    "reminder_days_before" INTEGER NOT NULL DEFAULT 30,
    "reminders_sent_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_at" TIMESTAMPTZ,
    "document_id" UUID,
    "notes" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID,
    "unit_id" UUID,
    "ticket_id" UUID,
    "vendor_id" UUID,
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "vendor_invoice_no" VARCHAR(100),
    "amount" DECIMAL(10,2) NOT NULL,
    "vat_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'AED',
    "receipt_date" DATE NOT NULL,
    "before_photo_url" TEXT,
    "after_photo_url" TEXT,
    "invoice_pdf_url" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_certificates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "tax_year" INTEGER NOT NULL,
    "gross_income_aed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expenses_aed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "mgmt_fee_aed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_collected_aed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_income_aed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fta_reference" VARCHAR(40),
    "pdf_url" TEXT,
    "status" "TaxCertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "emailed_at" TIMESTAMPTZ,
    "emailed_to" VARCHAR(200),
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tax_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "external_id" VARCHAR(200),
    "author_name" VARCHAR(200) NOT NULL,
    "rating" INTEGER NOT NULL,
    "rating_max" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT NOT NULL,
    "sentiment" "ReviewSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "property_id" UUID,
    "unit_id" UUID,
    "tenant_id" UUID,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "response_text" TEXT,
    "responded_at" TIMESTAMPTZ,
    "responded_by_id" UUID,
    "ai_draft_response" TEXT,
    "posted_at" TIMESTAMPTZ NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_responses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "campaign_name" VARCHAR(100) NOT NULL DEFAULT 'Quarterly NPS',
    "tenant_id" UUID,
    "owner_id" UUID,
    "recipient_phone" VARCHAR(30),
    "recipient_email" VARCHAR(200),
    "score" INTEGER,
    "comment" TEXT,
    "status" "NpsStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ,
    "responded_at" TIMESTAMPTZ,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_bids" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "amount_aed" DECIMAL(10,2) NOT NULL,
    "vat_included" BOOLEAN NOT NULL DEFAULT true,
    "eta_hours" INTEGER NOT NULL,
    "warranty_days" INTEGER NOT NULL DEFAULT 30,
    "message" TEXT,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "ai_rank" INTEGER,
    "ai_reason" TEXT,
    "accepted_at" TIMESTAMPTZ,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ticket_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_scores" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "avg_response_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "rework_rate_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sla_compliance_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_earned_aed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "composite_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "prev_rank" INTEGER,
    "badges" JSONB NOT NULL DEFAULT '[]',
    "computed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aecb_reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reporting_month" DATE NOT NULL,
    "on_time_payment" BOOLEAN NOT NULL DEFAULT true,
    "amount_aed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "score_at_report" INTEGER,
    "score_delta" INTEGER,
    "aecb_reference" VARCHAR(80),
    "status" "AecbReportStatus" NOT NULL DEFAULT 'QUEUED',
    "submitted_at" TIMESTAMPTZ,
    "failure_reason" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aecb_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "direction" "WhatsAppDirection" NOT NULL,
    "sender" "WhatsAppSender" NOT NULL,
    "tenant_id" UUID,
    "owner_id" UUID,
    "vendor_id" UUID,
    "recipient_phone" VARCHAR(30) NOT NULL,
    "body" TEXT NOT NULL,
    "media_url" TEXT,
    "template_name" VARCHAR(100),
    "twilio_sid" TEXT,
    "delivery_status" "WhatsAppDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "parent_message_id" UUID,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renovation_scenarios" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(10),
    "description" TEXT NOT NULL,
    "capex_aed" DECIMAL(10,2) NOT NULL,
    "rent_uplift_pct" DECIMAL(5,2) NOT NULL,
    "market_evidence" TEXT,
    "vacancy_days_hint" INTEGER NOT NULL DEFAULT 30,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renovation_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_custom_domain_key" ON "workspaces"("custom_domain");

-- CreateIndex
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_status_idx" ON "workspaces"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "workspace_users_workspace_id_role_idx" ON "workspace_users"("workspace_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_users_workspace_id_user_id_key" ON "workspace_users"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "otp_codes_phone_is_used_idx" ON "otp_codes"("phone", "is_used");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_is_active_idx" ON "push_tokens"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_user_id_token_app_variant_key" ON "push_tokens"("user_id", "token", "app_variant");

-- CreateIndex
CREATE INDEX "properties_workspace_id_status_idx" ON "properties"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "properties_workspace_id_type_idx" ON "properties"("workspace_id", "type");

-- CreateIndex
CREATE INDEX "properties_workspace_id_owner_id_idx" ON "properties"("workspace_id", "owner_id");

-- CreateIndex
CREATE INDEX "units_workspace_id_occupancy_status_idx" ON "units"("workspace_id", "occupancy_status");

-- CreateIndex
CREATE INDEX "units_property_id_idx" ON "units"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_property_id_unit_number_key" ON "units"("property_id", "unit_number");

-- CreateIndex
CREATE UNIQUE INDEX "owners_user_id_key" ON "owners"("user_id");

-- CreateIndex
CREATE INDEX "owners_workspace_id_idx" ON "owners"("workspace_id");

-- CreateIndex
CREATE INDEX "owners_phone_idx" ON "owners"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_user_id_key" ON "tenants"("user_id");

-- CreateIndex
CREATE INDEX "tenants_workspace_id_idx" ON "tenants"("workspace_id");

-- CreateIndex
CREATE INDEX "tenants_phone_idx" ON "tenants"("phone");

-- CreateIndex
CREATE INDEX "tenants_workspace_id_kyc_verified_idx" ON "tenants"("workspace_id", "kyc_verified");

-- CreateIndex
CREATE UNIQUE INDEX "leases_ejari_number_key" ON "leases"("ejari_number");

-- CreateIndex
CREATE UNIQUE INDEX "leases_lease_ref_key" ON "leases"("lease_ref");

-- CreateIndex
CREATE INDEX "leases_workspace_id_status_idx" ON "leases"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "leases_workspace_id_tenant_id_idx" ON "leases"("workspace_id", "tenant_id");

-- CreateIndex
CREATE INDEX "leases_unit_id_status_idx" ON "leases"("unit_id", "status");

-- CreateIndex
CREATE INDEX "leases_end_date_idx" ON "leases"("end_date");

-- CreateIndex
CREATE INDEX "commissions_workspace_id_status_idx" ON "commissions"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "commissions_lease_id_idx" ON "commissions"("lease_id");

-- CreateIndex
CREATE UNIQUE INDEX "move_out_inspections_lease_id_key" ON "move_out_inspections"("lease_id");

-- CreateIndex
CREATE INDEX "move_out_inspections_workspace_id_idx" ON "move_out_inspections"("workspace_id");

-- CreateIndex
CREATE INDEX "renewal_alerts_workspace_id_lease_id_idx" ON "renewal_alerts"("workspace_id", "lease_id");

-- CreateIndex
CREATE INDEX "renewal_alerts_lease_id_days_before_expiry_idx" ON "renewal_alerts"("lease_id", "days_before_expiry");

-- CreateIndex
CREATE INDEX "pdc_cheques_workspace_id_status_idx" ON "pdc_cheques"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "pdc_cheques_due_date_status_idx" ON "pdc_cheques"("due_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pdc_cheques_lease_id_cheque_seq_key" ON "pdc_cheques"("lease_id", "cheque_seq");

-- CreateIndex
CREATE INDEX "rent_collections_workspace_id_collected_at_idx" ON "rent_collections"("workspace_id", "collected_at");

-- CreateIndex
CREATE INDEX "rent_collections_lease_id_idx" ON "rent_collections"("lease_id");

-- CreateIndex
CREATE INDEX "rent_collections_tenant_id_idx" ON "rent_collections"("tenant_id");

-- CreateIndex
CREATE INDEX "expenses_workspace_id_expense_date_idx" ON "expenses"("workspace_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_property_id_idx" ON "expenses"("property_id");

-- CreateIndex
CREATE INDEX "owner_soas_workspace_id_owner_id_idx" ON "owner_soas"("workspace_id", "owner_id");

-- CreateIndex
CREATE INDEX "owner_soas_period_start_period_end_idx" ON "owner_soas"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_user_id_key" ON "vendors"("user_id");

-- CreateIndex
CREATE INDEX "vendors_workspace_id_status_idx" ON "vendors"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "vendors_workspace_id_is_approved_idx" ON "vendors"("workspace_id", "is_approved");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_ref_key" ON "tickets"("ticket_ref");

-- CreateIndex
CREATE INDEX "tickets_workspace_id_status_idx" ON "tickets"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "tickets_workspace_id_category_idx" ON "tickets"("workspace_id", "category");

-- CreateIndex
CREATE INDEX "tickets_assigned_vendor_id_status_idx" ON "tickets"("assigned_vendor_id", "status");

-- CreateIndex
CREATE INDEX "tickets_unit_id_idx" ON "tickets"("unit_id");

-- CreateIndex
CREATE INDEX "tickets_sla_due_at_sla_breached_idx" ON "tickets"("sla_due_at", "sla_breached");

-- CreateIndex
CREATE INDEX "documents_workspace_id_entity_type_entity_id_idx" ON "documents"("workspace_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "documents_doc_type_idx" ON "documents"("doc_type");

-- CreateIndex
CREATE INDEX "documents_expiry_date_idx" ON "documents"("expiry_date");

-- CreateIndex
CREATE INDEX "notifications_workspace_id_user_id_read_at_idx" ON "notifications"("workspace_id", "user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_workspace_id_type_idx" ON "notifications"("workspace_id", "type");

-- CreateIndex
CREATE INDEX "notifications_delivery_status_sent_at_idx" ON "notifications"("delivery_status", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_calls_call_sid_key" ON "ai_calls"("call_sid");

-- CreateIndex
CREATE INDEX "ai_calls_workspace_id_tenant_id_idx" ON "ai_calls"("workspace_id", "tenant_id");

-- CreateIndex
CREATE INDEX "ai_calls_initiated_at_idx" ON "ai_calls"("initiated_at");

-- CreateIndex
CREATE INDEX "property_listings_workspace_id_status_idx" ON "property_listings"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "rera_index_cache_area_idx" ON "rera_index_cache"("area");

-- CreateIndex
CREATE UNIQUE INDEX "rera_index_cache_area_property_type_bedroom_count_key" ON "rera_index_cache"("area", "property_type", "bedroom_count");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_entity_type_entity_id_idx" ON "audit_logs"("workspace_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_stripe_invoice_id_key" ON "subscription_invoices"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_workspace_id_idx" ON "subscription_invoices"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_workspace_id_idx" ON "api_keys"("workspace_id");

-- CreateIndex
CREATE INDEX "webhooks_workspace_id_is_active_idx" ON "webhooks"("workspace_id", "is_active");

-- CreateIndex
CREATE INDEX "compliance_items_workspace_id_status_expiry_date_idx" ON "compliance_items"("workspace_id", "status", "expiry_date");

-- CreateIndex
CREATE INDEX "compliance_items_workspace_id_category_idx" ON "compliance_items"("workspace_id", "category");

-- CreateIndex
CREATE INDEX "receipts_workspace_id_owner_id_receipt_date_idx" ON "receipts"("workspace_id", "owner_id", "receipt_date");

-- CreateIndex
CREATE INDEX "receipts_workspace_id_status_idx" ON "receipts"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "receipts_ticket_id_idx" ON "receipts"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_certificates_fta_reference_key" ON "tax_certificates"("fta_reference");

-- CreateIndex
CREATE INDEX "tax_certificates_workspace_id_tax_year_idx" ON "tax_certificates"("workspace_id", "tax_year");

-- CreateIndex
CREATE UNIQUE INDEX "tax_certificates_owner_id_tax_year_key" ON "tax_certificates"("owner_id", "tax_year");

-- CreateIndex
CREATE INDEX "reviews_workspace_id_source_posted_at_idx" ON "reviews"("workspace_id", "source", "posted_at");

-- CreateIndex
CREATE INDEX "reviews_workspace_id_sentiment_responded_idx" ON "reviews"("workspace_id", "sentiment", "responded");

-- CreateIndex
CREATE INDEX "nps_responses_workspace_id_status_created_at_idx" ON "nps_responses"("workspace_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "ticket_bids_workspace_id_status_idx" ON "ticket_bids"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "ticket_bids_ticket_id_status_idx" ON "ticket_bids"("ticket_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_bids_ticket_id_vendor_id_key" ON "ticket_bids"("ticket_id", "vendor_id");

-- CreateIndex
CREATE INDEX "vendor_scores_workspace_id_period_end_composite_score_idx" ON "vendor_scores"("workspace_id", "period_end", "composite_score");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_scores_vendor_id_period_start_period_end_key" ON "vendor_scores"("vendor_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "aecb_reports_workspace_id_status_idx" ON "aecb_reports"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "aecb_reports_tenant_id_reporting_month_key" ON "aecb_reports"("tenant_id", "reporting_month");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_twilio_sid_key" ON "whatsapp_messages"("twilio_sid");

-- CreateIndex
CREATE INDEX "whatsapp_messages_workspace_id_tenant_id_created_at_idx" ON "whatsapp_messages"("workspace_id", "tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_workspace_id_owner_id_created_at_idx" ON "whatsapp_messages"("workspace_id", "owner_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_workspace_id_vendor_id_created_at_idx" ON "whatsapp_messages"("workspace_id", "vendor_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_delivery_status_idx" ON "whatsapp_messages"("delivery_status");

-- CreateIndex
CREATE INDEX "renovation_scenarios_workspace_id_idx" ON "renovation_scenarios"("workspace_id");

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_renewed_from_lease_id_fkey" FOREIGN KEY ("renewed_from_lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_out_inspections" ADD CONSTRAINT "move_out_inspections_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_alerts" ADD CONSTRAINT "renewal_alerts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewal_alerts" ADD CONSTRAINT "renewal_alerts_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdc_cheques" ADD CONSTRAINT "pdc_cheques_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdc_cheques" ADD CONSTRAINT "pdc_cheques_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_collections" ADD CONSTRAINT "rent_collections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_collections" ADD CONSTRAINT "rent_collections_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_collections" ADD CONSTRAINT "rent_collections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_soas" ADD CONSTRAINT "owner_soas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_raised_by_tenant_id_fkey" FOREIGN KEY ("raised_by_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_vendor_id_fkey" FOREIGN KEY ("assigned_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_certificates" ADD CONSTRAINT "tax_certificates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_certificates" ADD CONSTRAINT "tax_certificates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_bids" ADD CONSTRAINT "ticket_bids_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_bids" ADD CONSTRAINT "ticket_bids_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_bids" ADD CONSTRAINT "ticket_bids_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_scores" ADD CONSTRAINT "vendor_scores_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_scores" ADD CONSTRAINT "vendor_scores_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aecb_reports" ADD CONSTRAINT "aecb_reports_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aecb_reports" ADD CONSTRAINT "aecb_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renovation_scenarios" ADD CONSTRAINT "renovation_scenarios_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

