'use client';

import { Home, Building2, Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RoleAppShell } from '@/components/layout/role-app-shell';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { notificationsApi } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/owner', label: 'Home', icon: Home },
  { href: '/owner/properties', label: 'Properties', icon: Building2 },
  { href: '/owner/search', label: 'Search', icon: Search },
  { href: '/owner/profile', label: 'Profile', icon: User },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  useRoleGuard(['OWNER']);

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  const unreadCount = (data as any)?.count ?? 0;

  return (
    <RoleAppShell navItems={NAV_ITEMS} notificationsHref="/owner/notifications" unreadCount={unreadCount}>
      {children}
    </RoleAppShell>
  );
}
