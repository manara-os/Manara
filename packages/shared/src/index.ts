// ── Shared types, constants, and utilities for Manara OS ──────────

// User Roles
export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  PM_ADMIN = 'PM_ADMIN',
  PM_OPS = 'PM_OPS',
  OWNER = 'OWNER',
  TENANT = 'TENANT',
  VENDOR = 'VENDOR',
}

// Ticket Priorities
export enum TicketPriority {
  EMERGENCY = 'EMERGENCY',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// Ticket Statuses
export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// Lease Statuses
export enum LeaseStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  RENEWED = 'RENEWED',
}

// Cheque Statuses
export enum ChequeStatus {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
  BOUNCED = 'BOUNCED',
  CANCELLED = 'CANCELLED',
}

// Country Codes
export enum CountryCode {
  AE = 'AE',
  IN = 'IN',
  GB = 'GB',
  SA = 'SA',
}

// Property Types
export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  TOWNHOUSE = 'TOWNHOUSE',
  OFFICE = 'OFFICE',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
}

// RERA rent increase rules
export function calculateReraMaxIncrease(currentRent: number, marketRent: number): number {
  const diff = (marketRent - currentRent) / marketRent;
  if (diff <= 0.10) return 0;
  if (diff <= 0.20) return 5;
  if (diff <= 0.30) return 10;
  if (diff <= 0.40) return 15;
  return 20;
}

// Format currency
export function formatCurrency(amount: number, currency = 'AED', locale = 'en-AE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(date: string | Date, locale = 'en-AE'): string {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

// Constants
export const DEMO_CREDENTIALS = {
  PM_ADMIN: { phone: '+971501000002', otp: '123456' },
  OWNER: { phone: '+971501000010', otp: '123456' },
  TENANT_HASSAN: { phone: '+971501000020', otp: '123456' },
  TENANT_FATIMA: { phone: '+971501000021', otp: '123456' },
  VENDOR: { phone: '+971501000030', otp: '123456' },
};

export const EAS_PROJECT_ID = '73b3722b-2fa2-46c1-b182-9c57e9a6db72';

export const UAE_VAT_RATE = 0.05;

export const QUEUE_NAMES = {
  RENEWAL_ALERTS: 'renewal-alerts',
  EJARI: 'ejari',
  NOTIFICATIONS: 'notifications',
  AI_CALLS: 'ai-calls',
  PMA_ALERTS: 'pma-alerts',
  DOCUMENT_EXPIRY: 'document-expiry',
} as const;
