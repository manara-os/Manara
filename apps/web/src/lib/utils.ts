import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined, currency = 'AED'): string {
  if (amount === undefined || amount === null) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  const formatter = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return formatter.format(num);
}

export function formatDate(date: string | Date | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—';
  try {
    return format(new Date(date), fmt);
  } catch {
    return '—';
  }
}

export function formatRelativeDate(date: string | Date | undefined): string {
  if (!date) return '—';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function formatPhone(phone: string): string {
  if (!phone) return '—';
  // Format +971XXXXXXXXX → +971 50 XXX XXXX
  if (phone.startsWith('+971')) {
    return phone.replace(/^\+971(\d{2})(\d{3})(\d{4})$/, '+971 $1 $2 $3');
  }
  return phone;
}

export function getInitials(name: string | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function calculateDaysOverdue(dueDate: string | Date): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getOccupancyColor(status: string): string {
  const colors: Record<string, string> = {
    OCCUPIED: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    VACANT: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    RESERVED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    MAINTENANCE: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getTicketPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-600',
    MEDIUM: 'bg-blue-100 text-blue-600',
    HIGH: 'bg-amber-100 text-amber-600',
    EMERGENCY: 'bg-red-100 text-red-600',
  };
  return colors[priority] || 'bg-gray-100 text-gray-600';
}

export function getLeaseStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    DRAFT: 'bg-gray-100 text-gray-600',
    EXPIRED: 'bg-red-100 text-red-600',
    RENEWED: 'bg-blue-100 text-blue-600',
    TERMINATED: 'bg-red-100 text-red-700',
    PENDING_EJARI: 'bg-amber-100 text-amber-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export function truncate(str: string, maxLength = 30): string {
  if (!str || str.length <= maxLength) return str || '';
  return `${str.slice(0, maxLength)}...`;
}

export function generateRef(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
