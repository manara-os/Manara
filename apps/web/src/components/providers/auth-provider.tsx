'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

const PUBLIC_ROUTES = ['/auth/login', '/auth/otp'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Break redirect loops: if store says authenticated but token is gone, clear state
    if (isAuthenticated && !localStorage.getItem('manara_access_token')) {
      logout();
      return;
    }

    const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

    if (!isAuthenticated && !isPublic) {
      router.replace('/auth/login');
    }

    if (isAuthenticated && isPublic) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, pathname, router, logout]);

  return <>{children}</>;
}
