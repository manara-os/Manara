import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { PmMobileNav } from '@/components/layout/pm-mobile-nav';
import { CookieConsent } from '@/components/legal/cookie-consent';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F6F3]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <PmMobileNav />
      </div>
      <CookieConsent />
    </div>
  );
}
