'use client';

import Link from 'next/link';
import {
  Megaphone, Users, FileText, UserCircle, Truck, AlertOctagon, Star,
  BarChart3, UserPlus, Shield, Lightbulb, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types';

interface MoreItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

interface MoreGroup {
  label: string;
  items: MoreItem[];
}

// Everything from the sidebar that isn't already one of PmMobileNav's 4
// primary tabs (Dashboard/Properties/Tickets/Finance).
const GROUPS: MoreGroup[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Listings', href: '/listings', icon: Megaphone, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Tenants', href: '/tenants', icon: Users, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Leases', href: '/leases', icon: FileText, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Owners', href: '/owners', icon: UserCircle, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Vendors', href: '/vendors', icon: Truck, roles: ['PM_ADMIN', 'PM_OPS'] },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Overdue', href: '/overdue', icon: AlertOctagon, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Reviews & NPS', href: '/reviews', icon: Star, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['PM_ADMIN'] },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Team', href: '/team', icon: UserPlus, roles: ['PM_ADMIN'] },
      { label: 'Compliance', href: '/compliance', icon: Shield, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Feature Requests', href: '/feature-requests', icon: Lightbulb, roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Settings', href: '/settings', icon: Settings, roles: ['PM_ADMIN'] },
    ],
  },
];

export default function MorePage() {
  const { user, currentWorkspace, logout } = useAuthStore();
  const userRole = currentWorkspace?.role as UserRole;

  const filteredGroups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.roles || item.roles.includes(userRole) || userRole === 'PLATFORM_ADMIN'),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-5 p-4 pb-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">More</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{user?.fullName} · {currentWorkspace?.workspace?.name}</p>
      </div>

      {filteredGroups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{group.label}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white border border-gray-100 shadow-sm p-3.5"
              >
                <item.icon className="h-5 w-5 text-amber-600" />
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={logout}
        className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl border border-red-100 text-red-600 text-sm font-medium"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
