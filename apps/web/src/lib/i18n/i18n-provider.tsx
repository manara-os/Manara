'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import en from './dictionaries/en.json';
import ar from './dictionaries/ar.json';

type Dict = typeof en;

const DICTS: Record<string, any> = { en, ar };

interface I18nCtx {
  locale: string;
  setLocale: (l: string) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nCtx>({
  locale: 'en',
  setLocale: () => {},
  t: (path) => path,
  isRtl: false,
});

const RTL_LOCALES = ['ar', 'ur'];
const STORAGE_KEY = 'manara-lang';

function lookup(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

export function I18nProvider({ children, defaultLocale = 'en' }: { children: ReactNode; defaultLocale?: string }) {
  const [locale, setLocaleState] = useState(defaultLocale);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) setLocaleState(saved);
  }, []);

  const setLocale = (l: string) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l;
      document.documentElement.dir = RTL_LOCALES.includes(l) ? 'rtl' : 'ltr';
    }
  };

  const t = useMemo(
    () => (path: string, vars?: Record<string, string | number>) => {
      const dict = DICTS[locale] ?? en;
      const fallback = lookup(en, path);
      let value = lookup(dict, path) ?? fallback ?? path;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return value;
    },
    [locale],
  );

  const isRtl = RTL_LOCALES.includes(locale);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
