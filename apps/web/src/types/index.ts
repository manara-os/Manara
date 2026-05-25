export type UserRole =
  | 'PLATFORM_ADMIN'
  | 'PM_ADMIN'
  | 'PM_OPS'
  | 'OWNER'
  | 'TENANT'
  | 'VENDOR';

export type WorkspaceStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ChequeStatus = 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED' | 'REPLACED';

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApiPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
