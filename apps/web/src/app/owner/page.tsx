'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Building2, Home as HomeIcon, TrendingUp, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ownersApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

type PmaStatus = 'ACTIVE' | 'PENDING_RENEWAL' | 'EXPIRED';

const PMA_CONFIG: Record<PmaStatus, { bg: string; border: string; text: string; icon: typeof CheckCircle2; label: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'PMA Active — in good standing' },
  PENDING_RENEWAL: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle, label: 'PMA renewal due — contact your property manager' },
  EXPIRED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle, label: 'PMA expired — contact your property manager' },
};

export default function OwnerHomePage() {
  const { user, currentWorkspace } = useAuthStore();
  const currencyCode = currentWorkspace?.workspace.currencyCode || 'AED';

  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ['owner', 'my-portfolio'],
    queryFn: () => ownersApi.getMyPortfolio(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['owner', 'my-profile'],
    queryFn: () => ownersApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const summary = (portfolio as any)?.summary;
  const pmaStatus: PmaStatus = (profile as any)?.pmaStatus ?? 'ACTIVE';
  const pma = PMA_CONFIG[pmaStatus] ?? PMA_CONFIG.ACTIVE;
  const monthlyRent = summary?.totalMonthlyRent ?? Math.round((summary?.totalAnnualRent ?? 0) / 12);

  const stats = [
    { label: 'Properties', value: summary?.totalProperties, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Occupied units', value: summary?.occupiedUnits, icon: HomeIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Vacant units', value: summary?.vacantUnits, icon: HomeIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Occupancy', value: summary ? `${summary.occupancyRate}%` : undefined, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {user?.fullName ? `Welcome, ${user.fullName.split(' ')[0]}` : 'Welcome'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Here's your portfolio overview</p>
      </div>

      {!profileLoading && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 ${pma.bg} ${pma.border}`}>
          <pma.icon className={`h-4 w-4 flex-shrink-0 ${pma.text}`} />
          <p className={`text-xs font-medium ${pma.text}`}>{pma.label}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${s.bg} mb-2`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              {portfolioLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold text-gray-900">{s.value ?? '—'}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm bg-amber-600">
        <CardContent className="p-5 text-center">
          {portfolioLoading ? (
            <Skeleton className="h-8 w-32 mx-auto bg-amber-500" />
          ) : (
            <p className="text-2xl font-extrabold text-white">{formatCurrency(monthlyRent, currencyCode)}</p>
          )}
          <p className="text-xs text-amber-100 mt-1">Expected income / month</p>
        </CardContent>
      </Card>

      <Link
        href="/owner/properties"
        className="text-center text-sm font-medium text-amber-700 hover:text-amber-800 py-1"
      >
        View all properties →
      </Link>
    </div>
  );
}
