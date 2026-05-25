'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

const PUBLIC_ROUTES = ['/auth/login', '/auth/otp', '/demo'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

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
    }

    // Auth'd users on auth pages → dashboard. /demo is public for everyone.
    if (isAuthenticated && isPublic && pathname !== '/demo') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, hasHydrated, pathname, router, logout]);

  // While hydrating, render nothing on protected routes to avoid flash of redirect
  if (!hasHydrated) {
    const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    if (!isPublic) return null;
  }

  return <>{children}</>;
}
