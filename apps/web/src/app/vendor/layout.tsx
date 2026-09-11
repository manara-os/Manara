'use client';

import { Home, Briefcase, Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RoleAppShell } from '@/components/layout/role-app-shell';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { notificationsApi } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/vendor', label: 'Home', icon: Home },
  { href: '/vendor/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/vendor/search', label: 'Search', icon: Search },
  { href: '/vendor/profile', label: 'Profile', icon: User },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  useRoleGuard(['VENDOR']);

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  const unreadCount = (data as any)?.count ?? 0;

  return (
    <RoleAppShell navItems={NAV_ITEMS} notificationsHref="/vendor/notifications" unreadCount={unreadCount}>
      {children}
    </RoleAppShell>
  );
}
