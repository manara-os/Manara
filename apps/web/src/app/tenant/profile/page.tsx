'use client';

import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, ShieldCheck, ShieldAlert, Flag, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { tenantsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function TenantProfilePage() {
  const { logout, currentWorkspace } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant', 'my-profile'],
    queryFn: () => tenantsApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const p = profile as any;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold text-gray-900">Profile</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700 mb-3">
            {isLoading ? '' : (p?.fullName?.[0]?.toUpperCase() ?? 'T')}
          </div>
          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <p className="text-base font-semibold text-gray-900">{p?.fullName}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{currentWorkspace?.workspace?.name}</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-col divide-y divide-gray-100">
          <div className="flex items-center gap-3 py-2.5">
            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700">{p?.phone ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate">{p?.email ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            {p?.kycVerified ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}
            <span className="text-sm text-gray-700">
              {p?.kycVerified ? 'KYC verified' : 'KYC pending verification'}
            </span>
          </div>
          {p?.screeningStatus && (
            <div className="flex items-center gap-3 py-2.5">
              <Flag className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">Screening: {p.screeningStatus.toLowerCase()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}
