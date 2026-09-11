'use client';

import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { notificationsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function VendorNotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list(),
    staleTime: 30 * 1000,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items: any[] = (data as any)?.data ?? [];
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Updates</h1>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No updates yet.</p>
          </div>
        )}

        {!isLoading && items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.readAt && markRead.mutate(n.id)}
            className={`text-left rounded-xl border p-3.5 transition-colors ${
              n.readAt ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm ${n.readAt ? 'text-gray-700 font-medium' : 'text-gray-900 font-semibold'}`}>
                {n.title}
              </p>
              {!n.readAt && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />}
            </div>
            {n.body && <p className="text-xs text-gray-500 mt-1">{n.body}</p>}
            <p className="text-[11px] text-gray-400 mt-1.5">{formatDate(n.createdAt, 'dd MMM, h:mm a')}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
