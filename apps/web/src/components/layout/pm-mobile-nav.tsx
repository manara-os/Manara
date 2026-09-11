'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Wrench, DollarSign, Grid2x2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// The 4 sections a PM opens most day-to-day, per the dashboard's own KPI
// row (revenue, overdue, tickets, vacancy). Everything else in the sidebar
// (Tenants, Leases, Owners, Vendors, Listings, Reports, Team, Settings, ...)
// lives behind "More" — a bottom tab bar can't fit the sidebar's full ~15
// sections, and PM staff need all of them, unlike Owner/Tenant/Vendor's
// handful of screens.
const TABS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/tickets', label: 'Tickets', icon: Wrench },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/more', label: 'More', icon: Grid2x2 },
] as const;

export function PmMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden grid grid-cols-5 flex-shrink-0 border-t border-gray-200 bg-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center justify-center gap-0.5 py-2"
          >
            <tab.icon className={cn('w-5 h-5', isActive ? 'text-amber-600' : 'text-gray-400')} />
            <span className={cn('text-[10px] font-medium', isActive ? 'text-amber-600' : 'text-gray-500')}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
