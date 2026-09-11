'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Wrench,
  DollarSign,
  UserCircle,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  UserPlus,
  AlertOctagon,
  MessageSquare,
  Lightbulb,
  Megaphone,
  Shield,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserRole } from '@/types';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n/i18n-provider';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles?: UserRole[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard, roles: ['PM_ADMIN', 'PM_OPS', 'PLATFORM_ADMIN'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Properties',  href: '/properties',  icon: Building2,       roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Listings',    href: '/listings',    icon: Megaphone,       roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Tenants',     href: '/tenants',     icon: Users,           roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Leases',      href: '/leases',      icon: FileText,        roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Maintenance', href: '/tickets',     icon: Wrench,          roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Owners',      href: '/owners',      icon: UserCircle,      roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Vendors',     href: '/vendors',     icon: Truck,           roles: ['PM_ADMIN', 'PM_OPS'] },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Finance',     href: '/finance',     icon: DollarSign,      roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Overdue',     href: '/overdue',     icon: AlertOctagon,    roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Reviews & NPS', href: '/reviews',   icon: Star,            roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Reports',     href: '/reports',     icon: BarChart3,       roles: ['PM_ADMIN'] },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Team',            href: '/team',             icon: UserPlus,    roles: ['PM_ADMIN'] },
      { label: 'Compliance',      href: '/compliance',       icon: Shield,      roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Feature Requests', href: '/feature-requests', icon: Lightbulb,   roles: ['PM_ADMIN', 'PM_OPS'] },
      { label: 'Settings',        href: '/settings',         icon: Settings,    roles: ['PM_ADMIN'] },
    ],
  },
];

const navItems: NavItem[] = navGroups.flatMap(g => g.items);

const SIDEBAR_W = 220;
const SIDEBAR_W_COLLAPSED = 60;

export function Sidebar() {
  const pathname = usePathname();
  const { user, currentWorkspace, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore();
  const userRole = currentWorkspace?.role as UserRole;
  const { t } = useT();

  // A tapped nav link should close the drawer on mobile; on desktop this
  // state is simply unused since the sidebar is never off-canvas there.
  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  const translate = (label: string): string => {
    const map: Record<string, string> = {
      Dashboard: t('nav.dashboard'),
      Properties: t('nav.properties'),
      Listings: t('nav.listings'),
      Tenants: t('nav.tenants'),
      Leases: t('nav.leases'),
      Maintenance: t('nav.maintenance'),
      Owners: t('nav.owners'),
      Vendors: t('nav.vendors'),
      Finance: t('nav.finance'),
      Overdue: t('nav.overdue'),
      'Reviews & NPS': t('nav.reviews'),
      Reports: t('nav.reports'),
      Team: t('nav.team'),
      Compliance: t('nav.compliance'),
      'Feature Requests': t('nav.feature_requests'),
      Settings: t('nav.settings'),
    };
    return map[label] ?? label;
  };

  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) => !item.roles || item.roles.includes(userRole) || userRole === 'PLATFORM_ADMIN',
      ),
    }))
    .filter((g) => g.items.length > 0);

  const isMobile = useIsMobile();
  // The desktop icon-only collapse mode has no analogue in a mobile drawer —
  // a drawer that's open but showing icon-only nav defeats the point of it.
  const showLabels = isMobile || !collapsed;

  return (
    <>
      {/* Backdrop — mobile only, closes the drawer on tap-outside */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        style={{
          ['--sidebar-w' as string]: `${collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W}px`,
          background: 'linear-gradient(180deg, #0A1628 0%, #0D1F35 60%, #0A1628 100%)',
        }}
        className={cn(
          // Mobile: fixed-width off-canvas drawer, slid via transform.
          'fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col h-screen overflow-hidden transition-transform duration-200 ease-out',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: back in normal flow, width driven by the collapse toggle.
          'md:relative md:z-auto md:translate-x-0 md:flex-shrink-0 md:w-[var(--sidebar-w)] md:min-w-[var(--sidebar-w)] md:transition-[width]',
        )}
      >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 h-14 border-b border-amber-500/20"
        style={{ minWidth: 0, background: 'linear-gradient(90deg, rgba(217,119,6,0.08) 0%, transparent 100%)' }}
      >
        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow: '0 2px 8px rgba(217,119,6,0.4)' }}>
          M
        </div>
        {showLabels && (
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="font-semibold text-white text-sm truncate leading-tight tracking-tight">
              {currentWorkspace?.workspace.name || 'Manara OS'}
            </span>
            <span className="text-[10px] text-amber-400/70 capitalize tracking-widest uppercase">
              {currentWorkspace?.workspace.subscriptionPlan?.toLowerCase() || 'pro'} plan
            </span>
          </div>
        )}

        {/* Mobile close — lives inside the drawer itself (z-50), so unlike
            Topbar's hamburger it's never covered by the drawer it controls. */}
        {mobileSidebarOpen && (
          <button
            onClick={closeMobileSidebar}
            className="md:hidden ml-auto p-1 rounded-lg text-amber-400/70 hover:text-amber-300 hover:bg-white/5 transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {filteredGroups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-4')}>
            {showLabels && group.label && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
            )}
            {!showLabels && group.label && gi > 0 && (
              <div className="mx-3 mb-1.5 h-px bg-white/5" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!showLabels ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg transition-all duration-150',
                      !showLabels ? 'px-2 py-2 justify-center' : 'px-3 py-2',
                      isActive
                        ? 'text-amber-300'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5',
                    )}
                    style={isActive ? { background: 'linear-gradient(90deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)', borderLeft: '2px solid #F59E0B' } : {}}
                  >
                    <item.icon
                      className={cn('flex-shrink-0 h-4 w-4',
                        isActive ? 'text-amber-400' : '')}
                    />
                    {showLabels && (
                      <span className="text-[13px] font-medium truncate">{translate(item.label)}</span>
                    )}
                    {showLabels && item.badge && item.badge > 0 && (
                      <span className="ml-auto text-[10px] bg-amber-500 text-white rounded-full px-1.5 py-0.5 font-medium leading-none">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-2 pb-3 pt-2 border-t border-amber-500/15 space-y-1">
        <div className={cn('flex items-center gap-2 px-2 py-1.5', !showLabels && 'justify-center')}>
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="text-[10px] font-semibold" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
              {user?.fullName?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {showLabels && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-slate-200 truncate">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-slate-500 capitalize truncate">
                {userRole?.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          title={!showLabels ? 'Sign out' : undefined}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors',
            !showLabels && 'justify-center',
          )}
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
          {showLabels && <span className="text-[12px]">Sign out</span>}
        </button>
      </div>

        {/* Collapse toggle — desktop only; the mobile drawer closes via the backdrop or a nav tap */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-[52px] h-5 w-5 rounded-full border border-amber-500/30 items-center justify-center text-amber-400/70 hover:text-amber-300 shadow-md z-10"
          style={{ background: '#0D1F35' }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  );
}
