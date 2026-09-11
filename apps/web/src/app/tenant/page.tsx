'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin, Wrench, FileText, PhoneCall } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { leasesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const QUICK_ACTIONS = [
  { label: 'Raise Ticket', href: '/tenant/maintenance', icon: Wrench, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  { label: 'My Documents', href: '/tenant/profile', icon: FileText, bg: 'bg-amber-50', color: 'text-amber-600' },
  { label: 'Contact PM', href: '/tenant/profile', icon: PhoneCall, bg: 'bg-blue-50', color: 'text-blue-600' },
];

export default function TenantHomePage() {
  const { user, currentWorkspace } = useAuthStore();
  const currencyCode = currentWorkspace?.workspace.currencyCode || 'AED';

  const { data, isLoading } = useQuery({
    queryKey: ['tenant', 'my-lease'],
    queryFn: () => leasesApi.list({ limit: 1 }),
    staleTime: 2 * 60 * 1000,
  });

  const lease: any = (data as any)?.data?.[0];
  const monthlyRent = lease ? Math.round(Number(lease.annualRent ?? 0) / 12) : undefined;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {user?.fullName ? `Welcome, ${user.fullName.split(' ')[0]}` : 'My Home'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">{currentWorkspace?.workspace?.name}</p>
      </div>

      {isLoading && <Skeleton className="h-32 w-full rounded-2xl" />}

      {!isLoading && lease && (
        <Card className="border-0 shadow-sm bg-indigo-600">
          <CardContent className="p-5">
            <p className="text-2xl font-extrabold text-white">Unit {lease.unit?.unitNumber}</p>
            <p className="text-sm text-indigo-100 mt-0.5">{lease.unit?.property?.name}</p>
            {lease.unit?.property?.area && (
              <p className="text-xs text-indigo-200 flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {lease.unit.property.area}
              </p>
            )}
            <div className="flex items-baseline gap-1.5 mt-3">
              <span className="text-xl font-bold text-white">{formatCurrency(monthlyRent, currencyCode)}</span>
              <span className="text-xs text-indigo-200">/ month</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !lease && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-gray-500">No active lease found on your account.</p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Quick actions</p>
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3.5 ${action.bg}`}
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
