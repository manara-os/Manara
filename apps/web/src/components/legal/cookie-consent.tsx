'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'manara-cookie-consent';

interface Consent {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt: string;
}

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) setShow(true);
  }, []);

  const persist = (consent: Consent) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    setShow(false);
  };

  const acceptAll = () =>
    persist({ essential: true, analytics: true, marketing: true, acceptedAt: new Date().toISOString() });

  const essentialOnly = () =>
    persist({ essential: true, analytics: false, marketing: false, acceptedAt: new Date().toISOString() });

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-3">
        <Cookie className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div className="flex-1 text-sm text-gray-700">
          <p className="font-medium">We use cookies to make Manara OS work.</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Essential cookies (auth, session) are always on. Analytics &amp; marketing cookies require your consent — UAE PDPL &amp; GDPR compliant.
            <a href="/privacy" className="underline ml-1">Privacy policy</a>.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={essentialOnly}>Essential only</Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={acceptAll}>Accept all</Button>
          <button onClick={essentialOnly} className="text-gray-400 hover:text-gray-700 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
