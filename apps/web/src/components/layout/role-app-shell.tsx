'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { ComponentType } from 'react';

export interface RoleNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface RoleAppShellProps {
  /** Exactly 4 items — this shell is built for a bottom tab bar, not a menu. */
  navItems: RoleNavItem[];
  notificationsHref: string;
  unreadCount?: number;
  children: React.ReactNode;
}

/**
 * The app-style shell for Owner/Tenant/Vendor: a slim top bar (workspace +
 * role, notifications bell) and a fixed bottom tab bar — deliberately not
 * the PM staff sidebar. Those roles have a handful of screens each, not the
 * dozen-plus sections PM Admin/Ops need, so a phone-app layout reads as
 * "this app has a few things for you" rather than an admin console with
 * most of the menu grayed out. The same shell renders identically whether
 * the page is opened in a normal browser tab or the installed PWA.
 */
export function RoleAppShell({ navItems, notificationsHref, unreadCount = 0, children }: RoleAppShellProps) {
  const pathname = usePathname();
  const { currentWorkspace } = useAuthStore();

  return (
    <div className="flex flex-col h-screen bg-[#F7F6F3]">
      <header
        className="flex items-center justify-between px-4 border-b border-gray-200 bg-white flex-shrink-0"
        style={{ height: 52, paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {currentWorkspace?.workspace?.name ?? 'Manara OS'}
          </p>
        </div>
        <Link
          href={notificationsHref}
          className="relative p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <nav
        className="grid flex-shrink-0 border-t border-gray-200 bg-white"
        style={{
          gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 py-2"
            >
              <item.icon className={cn('w-5 h-5', isActive ? 'text-amber-600' : 'text-gray-400')} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-amber-600' : 'text-gray-500')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
