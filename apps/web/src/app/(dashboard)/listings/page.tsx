'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ExternalLink, Eye, MessageSquare, Pause, Play, X, TrendingUp, Camera } from 'lucide-react';
import { toast } from 'sonner';

type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'SOLD' | 'RENTED';

const PORTAL_BRAND: Record<string, { label: string; bg: string; fg: string }> = {
  BAYUT:           { label: 'Bayut',          bg: 'bg-red-100',    fg: 'text-red-700' },
  PROPERTY_FINDER: { label: 'Property Finder', bg: 'bg-blue-100',   fg: 'text-blue-700' },
  PROPERTYFINDER:  { label: 'Property Finder', bg: 'bg-blue-100',   fg: 'text-blue-700' },
  DUBIZZLE:        { label: 'Dubizzle',        bg: 'bg-amber-100',  fg: 'text-amber-700' },
  HAUS_AND_HAUS:   { label: 'haus & haus',     bg: 'bg-slate-100',  fg: 'text-slate-700' },
  INTERNAL:        { label: 'Internal',        bg: 'bg-purple-100', fg: 'text-purple-700' },
};

const STATUS_BRAND: Record<ListingStatus, { label: string; bg: string; fg: string }> = {
  DRAFT:   { label: 'Draft',    bg: 'bg-gray-100',    fg: 'text-gray-700' },
  ACTIVE:  { label: 'Listed',   bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  PAUSED:  { label: 'Unpublished', bg: 'bg-amber-100', fg: 'text-amber-700' },
  EXPIRED: { label: 'Cancelled', bg: 'bg-red-100',    fg: 'text-red-700' },
  SOLD:    { label: 'Sold',     bg: 'bg-purple-100',  fg: 'text-purple-700' },
  RENTED:  { label: 'Rented',   bg: 'bg-blue-100',    fg: 'text-blue-700' },
};

const FILTERS = ['ALL', 'DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED'] as const;

interface Listing {
  id: string;
  status: ListingStatus;
  portal: string;
  title: string;
  askingRent?: number;
  views?: number;
  inquiries?: number;
  publishedAt?: string;
  expiresAt?: string;
  listingUrl?: string;
  externalListingId?: string;
  property?: { id: string; name: string; area?: string; city?: string; photos?: string[] };
}

export default function ListingsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<typeof FILTERS[number]>('ALL');

  const { data: summaryData } = useQuery({
    queryKey: ['listings-summary'],
    queryFn: () => api.get('/listings/summary'),
  });
  const summary: any = (summaryData as any)?.data ?? summaryData ?? {};

  const { data, isLoading } = useQuery({
    queryKey: ['listings', filter],
    queryFn: () => api.get('/listings', { params: filter === 'ALL' ? {} : { status: filter } }),
  });
  const items: Listing[] = ((data as any)?.data ?? data ?? []) as Listing[];

  const publish = useMutation({
    mutationFn: (id: string) => api.patch(`/listings/${id}/publish`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['listings'] }); qc.invalidateQueries({ queryKey: ['listings-summary'] }); toast.success('Listing published'); },
  });
  const pause = useMutation({
    mutationFn: (id: string) => api.patch(`/listings/${id}/pause`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['listings'] }); qc.invalidateQueries({ queryKey: ['listings-summary'] }); toast.success('Listing paused'); },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/listings/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['listings'] }); qc.invalidateQueries({ queryKey: ['listings-summary'] }); toast.success('Listing cancelled'); },
  });

  const aed = (n: number) => `AED ${(n ?? 0).toLocaleString()}`;

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" />
            Exclusive Leasing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage property listings across Bayut, Property Finder, Dubizzle, and other portals. Track views, inquiries, and conversion in one place.
          </p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => toast.info('Create-listing UI coming next — for now, list from a vacant unit on a Property page.')}>
          <Camera className="w-4 h-4 mr-1.5" /> New Listing
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total listings</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold">Active</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.active ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">Unpublished</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.paused ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Total Views</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{(summary.totalViews ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4">
            <p className="text-xs text-purple-700 uppercase tracking-wide font-semibold">Conversion</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{summary.conversionRate ?? 0}%</p>
            <p className="text-[10px] text-purple-500 mt-0.5">{summary.totalInquiries ?? 0} inquiries</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              filter === f ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'ALL' ? 'All' : STATUS_BRAND[f as ListingStatus]?.label ?? f}
            <span className="ml-1.5 text-[10px] text-gray-400">
              ({f === 'ALL' ? items.length : items.filter((i) => i.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Listings grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No listings in this view</p>
            <p className="text-xs text-gray-400 mt-1">Create a listing from a vacant property to start marketing it.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((l) => {
            const portalInfo = PORTAL_BRAND[l.portal] ?? { label: l.portal, bg: 'bg-gray-100', fg: 'text-gray-700' };
            const statusInfo = STATUS_BRAND[l.status];
            const photos = (l.property?.photos as string[]) ?? [];
            return (
              <Card key={l.id} className="overflow-hidden p-0 hover:shadow-lg transition-shadow">
                {photos.length > 0 ? (
                  <div className="h-36 relative">
                    <img src={photos[0]} alt={l.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.fg} shadow-sm`}>
                        {statusInfo.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${portalInfo.bg} ${portalInfo.fg} shadow-sm`}>
                        {portalInfo.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-36 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-amber-400" />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{l.title}</h3>
                    {l.property && (
                      <Link href={`/properties/${l.property.id}`} className="text-xs text-amber-600 hover:underline">
                        {l.property.name} · {l.property.area}, {l.property.city}
                      </Link>
                    )}
                  </div>
                  {l.askingRent && (
                    <p className="text-base font-bold text-gray-900">{aed(Number(l.askingRent))}<span className="text-xs font-normal text-gray-500">/yr</span></p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-blue-500" />
                      <span><b>{(l.views ?? 0).toLocaleString()}</b> <span className="text-gray-500">views</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-emerald-500" />
                      <span><b>{l.inquiries ?? 0}</b> <span className="text-gray-500">inquiries</span></span>
                    </div>
                  </div>
                  {l.publishedAt && (
                    <p className="text-[10px] text-gray-400">
                      Published {new Date(l.publishedAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
                      {l.expiresAt && ` · expires ${new Date(l.expiresAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}`}
                    </p>
                  )}
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {l.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => publish.mutate(l.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7">
                        <Play className="w-3 h-3 mr-1" /> Publish
                      </Button>
                    )}
                    {l.status === 'ACTIVE' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => pause.mutate(l.id)} className="text-xs h-7">
                          <Pause className="w-3 h-3 mr-1" /> Pause
                        </Button>
                        {l.listingUrl && (
                          <a
                            href={l.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50"
                          >
                            <ExternalLink className="w-3 h-3" /> Open
                          </a>
                        )}
                      </>
                    )}
                    {l.status === 'PAUSED' && (
                      <Button size="sm" onClick={() => publish.mutate(l.id)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7">
                        <Play className="w-3 h-3 mr-1" /> Republish
                      </Button>
                    )}
                    {l.status !== 'EXPIRED' && (
                      <Button size="sm" variant="outline" onClick={() => cancel.mutate(l.id)} className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7">
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
