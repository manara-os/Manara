'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { unitsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, User, FileText, Wrench, MapPin, Home, Bed, Bath, Ruler, ChevronRight } from 'lucide-react';

const OCCUPANCY_COLORS: Record<string, 'success' | 'warning' | 'secondary'> = {
  OCCUPIED: 'success',
  VACANT: 'warning',
  MAINTENANCE: 'secondary',
};

const TICKET_STATUS_COLORS: Record<string, 'destructive' | 'warning' | 'secondary' | 'success'> = {
  OPEN: 'warning',
  ASSIGNED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CLOSED: 'secondary',
  CANCELLED: 'secondary',
};

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => unitsApi.get(id),
    enabled: !!id,
  });

  const unit: any = (data as any)?.data ?? data;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!unit) return <div className="p-6 text-gray-500">Unit not found.</div>;

  const activeLease = unit.leases?.find((l: any) => l.status === 'ACTIVE');
  const pastLeases = unit.leases?.filter((l: any) => l.status !== 'ACTIVE') ?? [];
  const openTickets = unit.tickets ?? [];

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <button onClick={() => router.back()} className="hover:text-gray-700 mr-1">←</button>
        <Link href="/properties" className="hover:text-amber-600 hover:underline">Properties</Link>
        <ChevronRight className="w-3 h-3" />
        {unit.property && (
          <>
            <Link href={`/properties/${unit.property.id}`} className="hover:text-amber-600 hover:underline">
              {unit.property.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="text-gray-700 font-medium">{unit.unitNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
            <Home className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">Unit {unit.unitNumber}</h1>
              <Badge variant={OCCUPANCY_COLORS[unit.occupancyStatus] ?? 'secondary'}>
                {unit.occupancyStatus}
              </Badge>
              <Badge variant="outline">{unit.type?.replace(/_/g, ' ')}</Badge>
            </div>
            {unit.property && (
              <Link href={`/properties/${unit.property.id}`} className="text-gray-500 hover:text-amber-600 mt-1 inline-flex items-center gap-1 text-sm">
                <Building2 className="w-3.5 h-3.5" />
                {unit.property.name}
                <span className="text-gray-400">·</span>
                <MapPin className="w-3 h-3" />
                {unit.property.area}, {unit.property.city}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Current Tenant Banner (clickable into tenant + lease) */}
      {activeLease && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <Link href={`/tenants/${activeLease.tenantId ?? activeLease.tenant?.id}`} className="group flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                  {activeLease.tenant?.fullName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'T'}
                </div>
                <div>
                  <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Current tenant</p>
                  <p className="font-semibold text-gray-900 group-hover:text-amber-700 group-hover:underline">
                    {activeLease.tenant?.fullName}
                  </p>
                  <p className="text-xs text-gray-500">{activeLease.tenant?.phone}</p>
                </div>
              </Link>

              <div>
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Lease period</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(activeLease.startDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' → '}
                  {new Date(activeLease.endDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  AED {Number(activeLease.annualRent).toLocaleString()}/yr
                </p>
              </div>

              <div className="flex justify-end">
                <Link
                  href={`/leases/${activeLease.id}`}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Open lease
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!activeLease && unit.occupancyStatus === 'VACANT' && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">No active lease</p>
              <p className="text-sm text-gray-500">This unit is vacant and ready to lease.</p>
            </div>
            <Link
              href={`/leases/new?unitId=${unit.id}`}
              className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg"
            >
              <FileText className="w-3.5 h-3.5" />
              Create lease
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Unit Specs */}
      <Card>
        <CardHeader><CardTitle className="text-base">Unit Specifications</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              ['Type', unit.type?.replace(/_/g, ' '), Home],
              ['Bedrooms', unit.bedroomCount ?? '—', Bed],
              ['Bathrooms', unit.bathroomCount ?? '—', Bath],
              ['Area (sqft)', unit.areaSqft ? Number(unit.areaSqft).toLocaleString() : '—', Ruler],
              ['Floor', unit.floor ?? '—', null],
              ['Furnishing', unit.furnishingStatus?.replace(/_/g, ' ') ?? '—', null],
              ['Annual Rent', unit.annualRent ? `AED ${Number(unit.annualRent).toLocaleString()}` : '—', null],
              ['Security %', unit.securityDepositPct ? `${unit.securityDepositPct}%` : '—', null],
            ].map(([label, value, Icon]: any) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs uppercase tracking-wide">
                  {Icon && <Icon className="w-3 h-3" />}
                  {label}
                </div>
                <p className="font-medium text-gray-900 mt-1">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tickets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              Open Tickets ({openTickets.length})
            </CardTitle>
            <Link
              href={`/tickets?unitId=${unit.id}`}
              className="text-xs text-amber-600 hover:underline"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {openTickets.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">No open tickets for this unit. ✨</p>
          ) : (
            <div className="space-y-2">
              {openTickets.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/tickets/${t.id}`}
                  className="block border border-gray-200 rounded-lg p-3 hover:bg-amber-50 hover:border-amber-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{t.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.ticketRef} · {t.category?.replace(/_/g, ' ')} · {t.priority}
                      </p>
                    </div>
                    <Badge variant={TICKET_STATUS_COLORS[t.status] ?? 'secondary'}>{t.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease History */}
      {pastLeases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Lease History ({pastLeases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium text-xs uppercase">Tenant</th>
                  <th className="pb-2 font-medium text-xs uppercase">Period</th>
                  <th className="pb-2 font-medium text-xs uppercase">Annual Rent</th>
                  <th className="pb-2 font-medium text-xs uppercase">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pastLeases.map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="py-2.5">
                      <Link href={`/tenants/${l.tenantId ?? l.tenant?.id}`} className="text-amber-600 hover:underline font-medium">
                        {l.tenant?.fullName}
                      </Link>
                    </td>
                    <td className="py-2.5 text-gray-600 text-xs">
                      {new Date(l.startDate).toLocaleDateString('en-AE')} → {new Date(l.endDate).toLocaleDateString('en-AE')}
                    </td>
                    <td className="py-2.5 font-medium text-gray-900">AED {Number(l.annualRent).toLocaleString()}</td>
                    <td className="py-2.5">
                      <Badge variant="secondary">{l.status}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/leases/${l.id}`} className="text-xs text-amber-600 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
