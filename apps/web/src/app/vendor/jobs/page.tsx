'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ticketsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
] as const;

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'secondary'> = {
  OPEN: 'info',
  ASSIGNED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CLOSED: 'secondary',
};

export default function VendorJobsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('active');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'my-jobs'],
    queryFn: () => ticketsApi.list({ assignedToMe: true }),
    staleTime: 60 * 1000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ticketsApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor', 'my-jobs'] }),
  });

  const jobs: any[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const filtered = tab === 'active'
    ? jobs.filter((j) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(j.status))
    : jobs.filter((j) => ['COMPLETED', 'CLOSED'].includes(j.status));

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold text-gray-900">My Jobs</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            {tab === 'active' ? 'No active jobs right now.' : 'No completed jobs yet.'}
          </p>
        </div>
      )}

      {!isLoading && filtered.map((j) => (
        <Card key={j.id} className="border-0 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-gray-400 font-mono">{j.ticketRef}</span>
              <Badge variant={STATUS_VARIANT[j.status] ?? 'secondary'} className="text-[10px]">
                {j.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm font-medium text-gray-900">{j.title}</p>
            {j.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{j.description}</p>}
            <p className="text-xs text-gray-500 mt-1.5">{j.unit?.unitNumber} · {j.unit?.property?.name}</p>
            <p className="text-[11px] text-gray-400 mt-1">{formatDate(j.createdAt)}</p>

            {j.status === 'ASSIGNED' && (
              <Button
                size="sm"
                className="w-full mt-3 bg-amber-600 hover:bg-amber-700"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: j.id, status: 'IN_PROGRESS' })}
              >
                Start job
              </Button>
            )}
            {j.status === 'IN_PROGRESS' && (
              <Button
                size="sm"
                className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: j.id, status: 'COMPLETED' })}
              >
                Mark complete
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
