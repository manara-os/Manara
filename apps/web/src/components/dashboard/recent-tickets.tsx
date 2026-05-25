'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import { getTicketPriorityColor, formatRelativeDate } from '@/lib/utils';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ASSIGNED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RESOLVED: 'bg-amber-100 text-amber-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export function RecentTickets() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-tickets'],
    queryFn: () => ticketsApi.list({ limit: 6 }),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const tickets = (data as any)?.data ?? (data as any) ?? [];

  if (!tickets.length) {
    return <div className="text-center py-8 text-gray-500 text-sm">No open tickets</div>;
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket: any) => (
        <Link
          key={ticket.id}
          href={`/tickets/${ticket.id}`}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
        >
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getTicketPriorityColor(ticket.priority)}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{ticket.title}</span>
              <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {ticket.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              <span>{ticket.unit?.unitNumber} · {ticket.unit?.property?.name}</span>
              <span>·</span>
              <span>{formatRelativeDate(ticket.createdAt)}</span>
            </div>
          </div>
        </Link>
      ))}
      <Link href="/tickets" className="block text-center mt-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
        View all tickets →
      </Link>
    </div>
  );
}
