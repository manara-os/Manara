'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Briefcase, Clock, CheckCircle2, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ticketsApi, vendorsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export default function VendorHomePage() {
  const { user, currentWorkspace } = useAuthStore();

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['vendor', 'my-jobs'],
    queryFn: () => ticketsApi.list({ assignedToMe: true }),
    staleTime: 60 * 1000,
  });

  const { data: profile } = useQuery({
    queryKey: ['vendor', 'my-profile'],
    queryFn: () => vendorsApi.getMyProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const jobs: any[] = (ticketsData as any)?.data ?? (Array.isArray(ticketsData) ? ticketsData : []);
  const activeJobs = jobs.filter((j) => ['ASSIGNED', 'IN_PROGRESS'].includes(j.status));
  const completedJobs = jobs.filter((j) => ['COMPLETED', 'CLOSED'].includes(j.status));
  const p = profile as any;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {user?.fullName ? `Welcome, ${user.fullName.split(' ')[0]}` : 'Welcome'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">{currentWorkspace?.workspace?.name}</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5 text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 mb-1.5">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            {ticketsLoading ? <Skeleton className="h-5 w-6 mx-auto" /> : (
              <p className="text-lg font-bold text-gray-900">{activeJobs.length}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">Active</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5 text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            {ticketsLoading ? <Skeleton className="h-5 w-6 mx-auto" /> : (
              <p className="text-lg font-bold text-gray-900">{p?.totalJobsCompleted ?? completedJobs.length}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3.5 text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 mb-1.5">
              <Star className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{p?.rating ? Number(p.rating).toFixed(1) : '—'}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Rating</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Active jobs</p>
          {activeJobs.length > 0 && (
            <Link href="/vendor/jobs" className="text-xs font-medium text-amber-700 hover:text-amber-800">
              View all
            </Link>
          )}
        </div>

        {ticketsLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        )}

        {!ticketsLoading && activeJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Briefcase className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No active jobs right now.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {activeJobs.slice(0, 3).map((j) => (
            <Card key={j.id} className="border-0 shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] text-gray-400 font-mono">{j.ticketRef}</span>
                  <Badge variant={j.status === 'IN_PROGRESS' ? 'success' : 'warning'} className="text-[10px]">
                    {j.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-gray-900">{j.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{j.unit?.unitNumber} · {j.unit?.property?.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">{formatDate(j.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
