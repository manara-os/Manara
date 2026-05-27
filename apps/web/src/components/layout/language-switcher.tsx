'use client';

import { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/i18n-provider';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English',  nativeName: 'English',   flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic',   nativeName: 'العربية',     flag: '🇦🇪', rtl: true },
  { code: 'hi', name: 'Hindi',    nativeName: 'हिन्दी',     flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu',     nativeName: 'اردو',       flag: '🇵🇰', rtl: true },
  { code: 'tl', name: 'Tagalog',  nativeName: 'Filipino',   flag: '🇵🇭' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useT();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const select = (lang: Language) => {
    setLocale(lang.code);
    setOpen(false);
    toast.success(
      lang.code === 'ar' ? `تم تغيير اللغة إلى ${lang.nativeName}` :
      lang.code === 'hi' ? `भाषा बदलकर ${lang.nativeName} कर दी गई` :
      lang.code === 'ur' ? `زبان ${lang.nativeName} میں تبدیل کر دی گئی` :
      lang.code === 'tl' ? `Nabago sa ${lang.nativeName}` :
      `Language changed to ${lang.name}`
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm"
        title="Change language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden md:inline text-gray-700 font-medium text-xs">{current.code.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">Choose language</span>
            </div>
            <div className="py-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => select(lang)}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-gray-50 transition-colors ${
                    current.code === lang.code ? 'bg-amber-50' : ''
                  }`}
                >
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{lang.name}</p>
                    <p className={`text-xs text-gray-500 ${lang.rtl ? 'text-right' : ''}`} dir={lang.rtl ? 'rtl' : 'ltr'}>
                      {lang.nativeName}
                    </p>
                  </div>
                  {lang.rtl && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">RTL</span>
                  )}
                  {current.code === lang.code && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[10px] text-gray-500 leading-tight">
                Manara is fully localised for UAE residents · WhatsApp messages, contracts, and reports auto-translate to your chosen language.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
