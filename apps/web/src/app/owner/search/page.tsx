'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Building2, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ownersApi } from '@/lib/api';

export default function OwnerSearchPage() {
  const [query, setQuery] = useState('');

  const { data } = useQuery({
    queryKey: ['owner', 'my-portfolio'],
    queryFn: () => ownersApi.getMyPortfolio(),
    staleTime: 2 * 60 * 1000,
  });

  const properties: any[] = (data as any)?.owner?.properties ?? [];

  const { propertyResults, tenantResults } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { propertyResults: [], tenantResults: [] };

    const propertyResults = properties.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.area?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q),
    );

    const tenantResults: { unitNumber: string; propertyName: string; tenant: any }[] = [];
    for (const p of properties) {
      for (const u of p.units ?? []) {
        const tenant = u.leases?.[0]?.tenant;
        if (tenant && (tenant.fullName?.toLowerCase().includes(q) || tenant.phone?.includes(q))) {
          tenantResults.push({ unitNumber: u.unitNumber, propertyName: p.name, tenant });
        }
      }
    }

    return { propertyResults, tenantResults };
  }, [query, properties]);

  const hasQuery = query.trim().length > 0;
  const hasResults = propertyResults.length > 0 || tenantResults.length > 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold text-gray-900">Search</h1>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your properties or tenants"
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
        <p className="text-xs text-gray-400 text-center py-10">
          Search across your properties and tenants
        </p>
      )}

      {hasQuery && !hasResults && (
        <p className="text-xs text-gray-400 text-center py-10">No results for "{query}"</p>
      )}

      {propertyResults.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Properties</p>
          {propertyResults.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <p className="text-xs text-gray-500 truncate">{[p.area, p.city].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tenantResults.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tenants</p>
          {tenantResults.map((r, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{r.tenant.fullName}</p>
                <p className="text-xs text-gray-500 truncate">{r.propertyName} · Unit {r.unitNumber}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] flex-shrink-0">{r.tenant.phone}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
