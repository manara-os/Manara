/**
 * Where each role lands after login. PM staff get the full sidebar app at
 * /dashboard; Owner/Tenant/Vendor each get their own bottom-nav app, since
 * none of them have PM-staff permissions and the sidebar's nav items are
 * all gated to PM_ADMIN/PM_OPS — logging in as anything else previously
 * landed on a dashboard that rendered an empty sidebar and stuck-loading
 * widgets.
 */
export function roleHomePath(role?: string | null): string {
  switch (role) {
    case 'OWNER':
      return '/owner';
    case 'TENANT':
      return '/tenant';
    case 'VENDOR':
      return '/vendor';
    case 'PM_ADMIN':
    case 'PM_OPS':
    case 'PLATFORM_ADMIN':
    default:
      return '/dashboard';
  }
}

/** True if `pathname` falls under the app rooted at `base` (e.g. '/owner'). */
export function isUnderRoot(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}
