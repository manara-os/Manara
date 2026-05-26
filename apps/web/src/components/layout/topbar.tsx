'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell, BookOpen, Lightbulb, AlertOctagon, Crown, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { financeApi } from '@/lib/api';
import { useState } from 'react';
import { toast } from 'sonner';

const ROLE_ICON: Record<string, any> = {
  PM_ADMIN: Crown,
  WORKSPACE_OWNER: Crown,
  PM_OPS: Shield,
  PLATFORM_ADMIN: Crown,
};

const ROLE_LABEL: Record<string, string> = {
  PM_ADMIN: 'PM Admin',
  PM_OPS: 'PM Operations',
  WORKSPACE_OWNER: 'Workspace Owner',
  PLATFORM_ADMIN: 'Platform Admin',
  OWNER: 'Property Owner',
  TENANT: 'Tenant',
  VENDOR: 'Vendor',
};

export function Topbar() {
  const { user, currentWorkspace } = useAuthStore();
  const role = currentWorkspace?.role as string;
  const RoleIcon = ROLE_ICON[role] ?? Shield;
  const [openMenu, setOpenMenu] = useState<null | 'notif' | 'guide'>(null);

  // Overdue badge — counts items via finance API
  const { data: overdueData } = useQuery({
    queryKey: ['topbar-overdue'],
    queryFn: () => financeApi.getOverdue().catch(() => []),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const overdueItems = ((overdueData as any)?.data ?? overdueData ?? []) as any[];
  const overdueCount = Array.isArray(overdueItems) ? overdueItems.length : 0;
  const overdueAmount = Array.isArray(overdueItems)
    ? overdueItems.reduce((s, i) => s + Number(i.amount ?? 0), 0)
    : 0;

  return (
    <div className="h-12 px-5 flex items-center justify-between border-b border-gray-200 bg-white sticky top-0 z-30">
      {/* Left: workspace + role badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
          <RoleIcon className="w-3 h-3 text-amber-600" />
          {currentWorkspace?.workspace?.name ?? 'Manara OS'}
          <span className="text-gray-400">·</span>
          <span className="text-amber-700">{ROLE_LABEL[role] ?? role}</span>
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Product Guide */}
        <Link
          href="/feature-requests"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-gray-500" />
          Product Guide
        </Link>

        {/* Request Feature */}
        <Link
          href="/feature-requests"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-xs font-medium text-gray-700 transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          Request Feature
        </Link>

        {/* Overdue */}
        {overdueCount > 0 && (
          <Link
            href="/overdue"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 transition-colors"
            title={`AED ${overdueAmount.toLocaleString()} overdue across ${overdueCount} tenants`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            Rent Overdue
            <span className="bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
              {overdueCount}
            </span>
          </Link>
        )}

        {/* Notifications */}
        <button
          onClick={() => {
            setOpenMenu(openMenu === 'notif' ? null : 'notif');
            toast.info('Notifications panel — coming next');
          }}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5 text-gray-500" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
        </button>
      </div>
    </div>
  );
}
