'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { roleHomePath } from '@/lib/role-routes';

/**
 * Bounces a signed-in user out of a role-specific app section (e.g. /owner)
 * if their actual role doesn't belong there — defense in depth against a
 * stale bookmark or a manually-typed URL, on top of the redirect login
 * already does. AuthProvider has already handled the signed-out case by the
 * time this runs, so this only ever redirects between authenticated apps.
 */
export function useRoleGuard(allowed: string[]) {
  const router = useRouter();
  const { currentWorkspace, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;
    const role = currentWorkspace?.role;
    if (role && !allowed.includes(role)) {
      router.replace(roleHomePath(role));
    }
  }, [hasHydrated, currentWorkspace, allowed, router]);
}
