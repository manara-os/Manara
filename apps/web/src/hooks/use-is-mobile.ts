'use client';

import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)'; // matches Tailwind's `md` breakpoint

/**
 * SSR-safe viewport check. Renders `false` on the server and first paint
 * (matching the desktop-first CSS below `md:`), then corrects on mount —
 * a one-frame flash rather than a hydration mismatch.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
