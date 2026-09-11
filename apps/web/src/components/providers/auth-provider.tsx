'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { roleHomePath, isUnderRoot } from '@/lib/role-routes';

const PUBLIC_ROUTES = ['/auth/login', '/auth/otp', '/demo'];

// Owner/Tenant/Vendor each live entirely under their own root (/owner,
// /tenant, /vendor). Everything else in the app — /dashboard, /properties,
// /tenants, /tickets, etc. — is the PM staff sidebar app, which carries no
// role guard of its own (PM staff freely cross between all of those top-level
// routes, so it can't be scoped to a single root the way the other three
// roles are). A role-scoped user landing there — via a stale bookmark, a PWA
// shortcut, or the old hardcoded '/dashboard' start_url — would otherwise
// see the PM sidebar instead of their own app.
function isWrongRootForRole(pathname: string, role?: string | null): boolean {
  if (role !== 'OWNER' && role !== 'TENANT' && role !== 'VENDOR') return false;
  return !isUnderRoot(pathname, roleHomePath(role));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated, logout, currentWorkspace } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const role = currentWorkspace?.role;

  useEffect(() => {
    // Wait for Zustand to finish hydrating from localStorage on mount.
    // Without this guard, the first render sees isAuthenticated=false
    // (the default state) and redirects to /auth/login before the persisted
    // session is loaded.
    if (!hasHydrated) return;

    // Break redirect loops: if store says authenticated but token is gone, clear state
    if (isAuthenticated && !localStorage.getItem('manara_access_token')) {
      logout();
      return;
    }

    const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

    if (!isAuthenticated && !isPublic) {
      router.replace('/auth/login');
      return;
    }

    // Auth'd users on auth pages → their role's home. /demo is public for everyone.
    if (isAuthenticated && isPublic && pathname !== '/demo') {
      router.replace(roleHomePath(role));
      return;
    }

    // Auth'd Owner/Tenant/Vendor outside their own app → back to their home.
    if (isAuthenticated && !isPublic && isWrongRootForRole(pathname, role)) {
      router.replace(roleHomePath(role));
    }
  }, [isAuthenticated, hasHydrated, pathname, router, logout, role]);

  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // While hydrating, or while a redirect above is about to fire, render
  // nothing rather than the wrong app's layout for one frame.
  if (!hasHydrated) {
    if (!isPublic) return null;
  } else if (isAuthenticated && !isPublic && isWrongRootForRole(pathname, role)) {
    return null;
  }

  return <>{children}</>;
}
