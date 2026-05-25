'use client';

import Link from 'next/link';

// ─── Data ────────────────────────────────────────────────────────────────────

const ROLES = [
  {
    id: 'pm-admin',
    title: 'PM Admin',
    name: 'Ruqaiya Al Rashidi',
    phone: '501000002',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    icon: '🏢',
    access: ['Full dashboard', 'All 6 workflows', 'Finance & reports', 'Settings'],
  },
  {
    id: 'pm-ops',
    title: 'PM Ops',
    name: 'Omar Al Hashimi',
    phone: '501000003',
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    icon: '⚙️',
    access: ['Leases & tenants', 'Maintenance tickets', 'Owner updates', 'Finance view'],
  },
  {
    id: 'owner',
    title: 'Property Owner',
    name: 'Fatima Al Nahyan',
    phone: '501000011',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
    icon: '🏡',
    access: ['Portfolio overview', 'SOA & financials', 'PMA renewal alert', 'Documents'],
  },
  {
    id: 'tenant',
    title: 'Tenant',
    name: 'Sarah Mitchell',
    phone: '501000022',
    color: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-800',
    icon: '🔑',
    access: ['Move-in status', 'Rent payments (PDC)', 'Raise tickets', 'Documents'],
  },
];

const WORKFLOWS = [
  {
    num: '①',
    title: 'New Tenant Move-In',
    status: 'PENDING → ONGOING → COMPLETE',
    description: 'Faisal Al Zaabi has a brand-new lease. Walk through the 3-step handover: schedule key handover, confirm checklist, complete move-in.',
    tenant: 'Faisal Al Zaabi',
    phone: '501000023',
    path: '/leases/00000000-0000-0000-0002-000000000004',
    color: 'border-l-amber-400',
    badgeColor: 'bg-amber-100 text-amber-700',
    icon: '📦',
  },
  {
    num: '②',
    title: 'Move-In Ongoing',
    status: 'ONGOING → COMPLETE',
    description: 'Sarah Mitchell is mid move-in. Advance status to COMPLETE to trigger BullMQ renewal alerts scheduled at 120/60/30/15 days.',
    tenant: 'Sarah Mitchell',
    phone: '501000022',
    path: '/leases/00000000-0000-0000-0002-000000000003',
    color: 'border-l-blue-400',
    badgeColor: 'bg-blue-100 text-blue-700',
    icon: '🏠',
  },
  {
    num: '③',
    title: 'Commission Verification',
    status: 'PENDING VERIFICATION → VERIFIED',
    description: 'Rajan Mehta\'s leasing commission is AED 9,167 awaiting PM Admin sign-off. Click Verify to release it to the Finance ledger.',
    tenant: 'Rajan Mehta',
    phone: '501000020',
    path: '/leases/00000000-0000-0000-0002-000000000002',
    color: 'border-l-green-400',
    badgeColor: 'bg-green-100 text-green-700',
    icon: '💰',
  },
  {
    num: '④',
    title: 'Lease Renewal',
    status: 'Expiring in 45 days',
    description: 'Nadia Al Farsi\'s lease expires in 45 days. Review RERA rent analysis (market rate gap), then Initiate Renewal to generate the new lease.',
    tenant: 'Nadia Al Farsi',
    phone: '501000021',
    path: '/leases/00000000-0000-0000-0002-000000000001',
    color: 'border-l-orange-400',
    badgeColor: 'bg-orange-100 text-orange-700',
    icon: '📋',
  },
  {
    num: '⑤',
    title: 'Move-Out & Settlement',
    status: 'IN PROGRESS',
    description: 'James Okafor is moving out. Inspection is IN_PROGRESS. Review damages (AED 2,800 maintenance + AED 8,450 settlement), finalise to release unit as VACANT.',
    tenant: 'James Okafor',
    phone: '501000024',
    path: '/leases/00000000-0000-0000-0002-000000000005',
    color: 'border-l-red-400',
    badgeColor: 'bg-red-100 text-red-700',
    icon: '🚚',
  },
  {
    num: '⑥',
    title: 'PMA Renewal',
    status: 'PENDING RENEWAL',
    description: 'Fatima Al Nahyan\'s Property Management Agreement expires 22 Jun 2026. Trigger renewal alert and update PMA status.',
    tenant: 'Fatima Al Nahyan (Owner)',
    phone: '501000011',
    path: '/owners',
    color: 'border-l-purple-400',
    badgeColor: 'bg-purple-100 text-purple-700',
    icon: '📝',
  },
];

const MODULES = [
  { icon: '🏗️', title: 'Properties', desc: '3 properties, 9 units across Dubai Marina, Downtown, JVC', path: '/properties' },
  { icon: '👥', title: 'Tenants', desc: '8 tenants — mix of screening statuses, nationalities, PDC cheques', path: '/tenants' },
  { icon: '📄', title: 'Leases', desc: '7 leases covering all 6 workflow states + Ejari/RERA analysis', path: '/leases' },
  { icon: '🔧', title: 'Maintenance', desc: '5 tickets — OPEN, ASSIGNED, IN_PROGRESS across properties', path: '/tickets' },
  { icon: '💳', title: 'Finance', desc: 'PDC cheques, rent collections, expenses, commission ledger', path: '/finance' },
  { icon: '🏠', title: 'Owners', desc: '3 owners — KYC verified, PMA statuses, income overview', path: '/owners' },
  { icon: '🔨', title: 'Vendors', desc: 'QuickFix (maintenance) + CoolBreeze (HVAC) — approval flow', path: '/vendors' },
  { icon: '📊', title: 'Reports', desc: 'Occupancy, revenue, maintenance and lease trend reports', path: '/reports' },
];

// ─── Components ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(text)}
      className="ml-1 text-xs text-gray-400 hover:text-amber-600 transition-colors"
      title="Copy"
    >
      ⧉
    </button>
  );
}

function RoleCard({ role }: { role: typeof ROLES[0] }) {
  return (
    <div className={`rounded-xl border-2 p-5 ${role.bg} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{role.icon}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${role.badge}`}>{role.title}</span>
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
        <div className="flex items-center gap-1 mt-1">
          <code className="text-xs bg-white/70 px-2 py-0.5 rounded font-mono">+971 {role.phone.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3')}</code>
          <CopyButton text={role.phone} />
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <code className="text-xs bg-white/70 px-2 py-0.5 rounded font-mono">OTP: 123456</code>
          <CopyButton text="123456" />
        </div>
      </div>
      <ul className="space-y-1">
        {role.access.map(a => (
          <li key={a} className="text-xs text-gray-600 flex items-center gap-1.5">
            <span className="text-green-500">✓</span>{a}
          </li>
        ))}
      </ul>
      <Link
        href={`/auth/login?phone=${role.phone}`}
        className={`mt-auto text-center text-xs font-semibold text-white py-2 rounded-lg bg-gradient-to-r ${role.color} hover:opacity-90 transition-opacity`}
      >
        Login as {role.title}
      </Link>
    </div>
  );
}

function WorkflowCard({ wf }: { wf: typeof WORKFLOWS[0] }) {
  return (
    <div className={`rounded-xl border border-gray-200 border-l-4 ${wf.color} bg-white p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{wf.icon}</span>
          <span className="text-lg font-semibold text-gray-400">{wf.num}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${wf.badgeColor}`}>{wf.status}</span>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{wf.title}</h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{wf.description}</p>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <span className="text-xs text-gray-400">Login:</span>
        <code className="text-xs bg-gray-50 px-2 py-0.5 rounded font-mono">{wf.phone}</code>
        <CopyButton text={wf.phone} />
        <span className="text-xs text-gray-300">|</span>
        <code className="text-xs bg-gray-50 px-2 py-0.5 rounded font-mono">123456</code>
      </div>
      <Link
        href={wf.path}
        className="text-center text-xs font-semibold text-white py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        Launch Scenario →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPortalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🏠</div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Manara OS</h1>
              <p className="text-amber-100 text-sm">UAE Property Management Operating System</p>
            </div>
          </div>
          <p className="text-white/90 text-lg max-w-2xl leading-relaxed mt-4">
            AI-powered platform for UAE property management companies — covering the full lifecycle
            from tenant screening & move-in through RERA rent analysis, Ejari registration,
            commission tracking, and PMA renewals.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {['Ejari / DLD Integration', 'RERA Rent Analysis', 'AI Rent Calls', 'PDC Cheque Tracking', 'Multi-tenant SaaS', 'WhatsApp Alerts'].map(f => (
              <span key={f} className="text-xs bg-white/20 backdrop-blur px-3 py-1 rounded-full font-medium">{f}</span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth/login" className="bg-white text-amber-700 font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-amber-50 transition-colors">
              Start Demo →
            </Link>
            <Link href="/dashboard" className="bg-white/20 text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-white/30 transition-colors">
              Jump to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-14">

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Demo Properties', value: '3', sub: 'Marina, Downtown, JVC' },
            { label: 'Demo Tenants', value: '8', sub: 'Varied workflow states' },
            { label: 'Active Leases', value: '7', sub: 'All 6 scenarios seeded' },
            { label: 'OTP for all', value: '123456', sub: 'No SMS needed' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Login by Role */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Login by Role</h2>
          <p className="text-sm text-gray-500 mb-5">Each role sees a different interface. OTP is <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-amber-700">123456</code> for all accounts.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROLES.map(r => <RoleCard key={r.id} role={r} />)}
          </div>
        </section>

        {/* 6 Workflow Scenarios */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">6 Live Workflow Scenarios</h2>
          <p className="text-sm text-gray-500 mb-5">All scenarios are pre-seeded with real UAE data. Log in as <strong>PM Admin</strong> (501000002) to access all of them.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WORKFLOWS.map(wf => <WorkflowCard key={wf.num} wf={wf} />)}
          </div>
        </section>

        {/* Module Explorer */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Explore All Modules</h2>
          <p className="text-sm text-gray-500 mb-5">Navigate directly to any section. Make sure you're logged in as PM Admin first.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MODULES.map(m => (
              <Link key={m.title} href={m.path} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all group">
                <span className="text-2xl">{m.icon}</span>
                <p className="font-semibold text-gray-900 text-sm mt-2 group-hover:text-amber-700">{m.title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{m.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Architecture Overview */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Technical Architecture</h2>
          <p className="text-sm text-gray-500 mb-5">Full-stack enterprise SaaS — 211+ production files across 5 apps.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Backend — NestJS API',
                color: 'border-blue-200 bg-blue-50',
                badge: 'bg-blue-100 text-blue-700',
                items: ['15 modules (auth, properties, leases, finance…)', 'JWT OTP auth (no passwords)', 'BullMQ queues (renewals, Ejari, AI calls)', 'Prisma + PostgreSQL + Redis', 'Stripe billing + Webhook handler', 'Swagger docs at /api/docs'],
              },
              {
                title: 'Frontend — Next.js 15',
                color: 'border-amber-200 bg-amber-50',
                badge: 'bg-amber-100 text-amber-700',
                items: ['25+ pages — all modules fully wired', 'shadcn/ui components + Tailwind CSS', 'React Query for data fetching', 'Zustand auth store', 'Recharts dashboards', 'Deployed on Vercel'],
              },
              {
                title: 'Mobile — Expo SDK 54',
                color: 'border-purple-200 bg-purple-50',
                badge: 'bg-purple-100 text-purple-700',
                items: ['Tenant app (move-in status, PDC, tickets)', 'Owner app (portfolio, PMA status, SOA)', 'Vendor app (jobs, active, history)', 'FCM push notifications', 'OTP auth (shared with web)', 'EAS build configured'],
              },
            ].map(a => (
              <div key={a.title} className={`rounded-xl border-2 p-5 ${a.color}`}>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.badge}`}>{a.title}</span>
                <ul className="mt-3 space-y-1.5">
                  {a.items.map(item => (
                    <li key={item} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-gray-400 mt-0.5">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* UAE Compliance */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">UAE Compliance & Integrations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🏛️', title: 'Ejari / DLD', desc: 'Lease registration with Dubai Land Department. Mock mode in dev, live API in production.' },
              { icon: '📊', title: 'RERA Rent Index', desc: 'Smart Rental Index integration — auto-calculates max allowable rent increase (0–20%).' },
              { icon: '🤖', title: 'AI Rent Calls', desc: 'OpenAI TTS + Twilio — automated voice calls to tenants for rent reminders.' },
              { icon: '💬', title: 'WhatsApp / SMS', desc: 'Twilio integration for OTP delivery, lease alerts, and renewal notifications.' },
            ].map(c => (
              <div key={c.title} className="text-center p-3">
                <span className="text-3xl">{c.icon}</span>
                <p className="font-semibold text-gray-900 text-sm mt-2">{c.title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-gray-400">Manara OS v3.0 — UAE Property Management Operating System</p>
          <p className="text-xs text-gray-300 mt-1">Demo environment — all data is synthetic. OTP bypass: 123456</p>
        </div>

      </div>
    </div>
  );
}
