'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Wrench, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ticketsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'secondary'> = {
  OPEN: 'info',
  ASSIGNED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CLOSED: 'secondary',
};

export default function TenantSearchPage() {
  const [query, setQuery] = useState('');

  const { data } = useQuery({
    queryKey: ['tenant', 'my-tickets'],
    queryFn: () => ticketsApi.list(),
    staleTime: 60 * 1000,
  });

  const tickets: any[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tickets.filter((t) =>
      t.title?.toLowerCase().includes(q) ||
      t.ticketRef?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q),
    );
  }, [query, tickets]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold text-gray-900">Search</h1>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your maintenance requests"
          className="pl-9 pr-9"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!hasQuery && (
        <p className="text-xs text-gray-400 text-center py-10">Search your maintenance requests</p>
      )}

      {hasQuery && results.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-10">No results for "{query}"</p>
      )}

      {results.map((t) => (
        <div key={t.id} className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Wrench className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
              <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'} className="text-[10px] flex-shrink-0">{t.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{t.ticketRef} · {formatDate(t.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
