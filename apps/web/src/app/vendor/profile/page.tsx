'use client';

import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, ShieldCheck, ShieldAlert, Star, Wrench, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { vendorsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function VendorProfilePage() {
  const { logout, currentWorkspace } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['vendor', 'my-profile'],
    queryFn: () => vendorsApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const p = profile as any;

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold text-gray-900">Profile</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-xl font-bold text-amber-700 mb-3">
            {isLoading ? '' : (p?.companyName?.[0]?.toUpperCase() ?? 'V')}
          </div>
          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <p className="text-base font-semibold text-gray-900">{p?.companyName}</p>
          )}
          {p?.contactName && <p className="text-xs text-gray-500 mt-0.5">{p.contactName}</p>}
          <p className="text-xs text-gray-400 mt-0.5">{currentWorkspace?.workspace?.name}</p>

          {!isLoading && p?.rating != null && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium text-gray-700">{Number(p.rating).toFixed(1)}</span>
              <span className="text-xs text-gray-400">· {p.totalJobsCompleted ?? 0} jobs completed</span>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && p?.serviceCategories?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Service categories</p>
            <div className="flex flex-wrap gap-1.5">
              {p.serviceCategories.map((c: string) => (
                <Badge key={c} variant="secondary" className="text-[11px]">
                  <Wrench className="h-3 w-3 mr-1" />
                  {c.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            {p?.isApproved ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}
            <span className="text-sm text-gray-700">
              {p?.isApproved ? 'Approved vendor' : 'Approval pending'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}
