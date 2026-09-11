'use client';

import { Home, Wrench, Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RoleAppShell } from '@/components/layout/role-app-shell';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { notificationsApi } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/tenant', label: 'Home', icon: Home },
  { href: '/tenant/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/tenant/search', label: 'Search', icon: Search },
  { href: '/tenant/profile', label: 'Profile', icon: User },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  useRoleGuard(['TENANT']);

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  const unreadCount = (data as any)?.count ?? 0;

  return (
    <RoleAppShell navItems={NAV_ITEMS} notificationsHref="/tenant/notifications" unreadCount={unreadCount}>
      {children}
    </RoleAppShell>
  );
}
