'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker and re-registers it on every navigation so an
 * update deployed to Vercel is picked up (`updateViaCache: 'none'` on the
 * registration keeps the browser from caching sw.js itself — see next.config.js
 * headers). This runs client-side only; SSR never touches `navigator`.
 */
export function PwaProvider() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => {
        // Installability degrades gracefully to a normal tab; nothing to
        // surface to the user if registration fails.
      });
  }, []);

  return null;
}
