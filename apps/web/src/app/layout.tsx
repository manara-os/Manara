import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Kufi_Arabic } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { PwaProvider } from '@/components/providers/pwa-provider';
import { I18nProvider } from '@/lib/i18n/i18n-provider';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Manara OS — UAE Property Management',
    template: '%s | Manara OS',
  },
  description:
    'Manara OS is the UAE-first, AI-powered property management platform for property management companies, owners, tenants and vendors.',
  keywords: ['property management', 'UAE', 'Dubai', 'real estate', 'Ejari', 'RERA', 'PropTech'],
  authors: [{ name: 'Manara OS' }],
  creator: 'Manara OS',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://manaraos.ae'),
  openGraph: {
    type: 'website',
    locale: 'en_AE',
    url: 'https://manaraos.ae',
    siteName: 'Manara OS',
    title: 'Manara OS — UAE Property Management Operating System',
    description: 'The lighthouse for UAE property management',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manara OS',
    description: 'UAE Property Management Operating System',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Manara OS',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 'cover' lets standalone-mode content run under the notch/home-indicator
  // safe areas; zoom is left at its default rather than locked, which would
  // block pinch-to-zoom for anyone who needs it (WCAG 1.4.4).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#D97706' },
    { media: '(prefers-color-scheme: dark)', color: '#451A03' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoKufiArabic.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <I18nProvider>
                {children}
              </I18nProvider>
              <PwaProvider />
              <Toaster
                position="top-right"
                richColors
                expand={false}
                toastOptions={{
                  duration: 4000,
                  classNames: {
                    toast: 'font-sans text-sm',
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
