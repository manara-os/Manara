'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Wrench, Home, FileText, DollarSign, TrendingUp, Sparkles } from 'lucide-react';

type ReportType = 'occupancy' | 'revenue' | 'maintenance' | 'tenants' | 'leases';

const REPORT_TABS: { key: ReportType; label: string; icon: string }[] = [
  { key: 'occupancy', label: 'Occupancy', icon: '🏢' },
  { key: 'revenue', label: 'Revenue', icon: '💰' },
  { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { key: 'tenants', label: 'Tenants', icon: '👤' },
  { key: 'leases', label: 'Leases', icon: '📋' },
];

// ─────────────────────────────────────────────────────────────────────
// Kpi + helpers
// ─────────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}

function Kpi({ label, value, sub, tone = 'neutral' }: KpiProps) {
  const color =
    tone === 'good' ? 'text-emerald-600' :
    tone === 'warn' ? 'text-amber-600' :
    tone === 'bad'  ? 'text-red-600' :
    'text-gray-900';
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100">
      <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, accent, icon: Icon, children }: { title: string; accent: string; icon: any; children: React.ReactNode }) {
  return (
    <Card style={{ background: accent }} className="border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StackBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <p className="text-xs text-gray-400">No data yet</p>;
  return (
    <div className="space-y-1">
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 gap-2 flex-wrap">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label}: <b className="text-gray-700">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 4-section Master Dashboard
// ─────────────────────────────────────────────────────────────────────

function MasterDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-master-dashboard'],
    queryFn: () => api.get('/reports/master-dashboard'),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56" />)}
      </div>
    );
  }

  const dash: any = (data as any)?.data ?? data ?? {};
  const ops = dash.operations?.maintenance ?? {};
  const inv = dash.inventoryAndVacancy ?? {};
  const lease = dash.leasingAndRenewals ?? {};
  const fin = dash.financialsAndRevenue ?? {};

  const fmt = (n: number) => (n ?? 0).toLocaleString();
  const aed = (n: number) => `AED ${fmt(n ?? 0)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Section 1: Operations */}
      <SectionCard title="Operations" accent="#FEF3C7" icon={Wrench}>
        <div className="grid grid-cols-4 gap-2">
          <Kpi label="Open" value={fmt(ops.open ?? 0)} tone="warn" />
          <Kpi label="Assigned" value={fmt(ops.assigned ?? 0)} />
          <Kpi label="In Progress" value={fmt(ops.inProgress ?? 0)} />
          <Kpi label="Completed (30d)" value={fmt(ops.completed ?? 0)} tone="good" />
        </div>
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-600 mb-1">Maintenance flow</p>
          <StackBar
            segments={[
              { label: 'Open',        value: ops.open ?? 0,        color: '#F59E0B' },
              { label: 'Assigned',    value: ops.assigned ?? 0,    color: '#3B82F6' },
              { label: 'In Progress', value: ops.inProgress ?? 0,  color: '#8B5CF6' },
              { label: 'Completed',   value: ops.completed ?? 0,   color: '#10B981' },
            ]}
          />
        </div>
        <Link href="/tickets" className="text-xs text-amber-700 hover:underline mt-3 inline-block">View tickets →</Link>
      </SectionCard>

      {/* Section 2: Inventory & Vacancy */}
      <SectionCard title="Inventory & Vacancy" accent="#ECFDF5" icon={Home}>
        <div className="grid grid-cols-2 gap-2">
          <Kpi
            label="Actual Vacant"
            value={`${fmt(inv.actualVacant ?? 0)} / ${fmt(inv.totalUnits ?? 0)}`}
            sub={`${inv.totalUnits > 0 ? Math.round((inv.actualVacant / inv.totalUnits) * 100) : 0}% of inventory`}
            tone={inv.actualVacant > (inv.totalUnits ?? 0) * 0.2 ? 'warn' : 'good'}
          />
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Upcoming Vacancies</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-sm"><b className="text-emerald-700">{fmt(inv.upcomingVacancies?.in30d ?? 0)}</b> <span className="text-[10px] text-gray-500">30d</span></span>
              <span className="text-sm"><b className="text-amber-700">{fmt(inv.upcomingVacancies?.in60d ?? 0)}</b> <span className="text-[10px] text-gray-500">60d</span></span>
              <span className="text-sm"><b className="text-red-700">{fmt(inv.upcomingVacancies?.in90d ?? 0)}</b> <span className="text-[10px] text-gray-500">90d</span></span>
            </div>
          </div>
        </div>
        <div className="mt-3 bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-2">Inventory status</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><b className="text-emerald-700 text-base block">{fmt(inv.listings?.listed ?? 0)}</b> <span className="text-gray-500">Listed</span></div>
            <div><b className="text-amber-700 text-base block">{fmt(inv.listings?.unpublished ?? 0)}</b> <span className="text-gray-500">Unpublished</span></div>
            <div><b className="text-red-700 text-base block">{fmt(inv.listings?.cancelled ?? 0)}</b> <span className="text-gray-500">Cancelled</span></div>
          </div>
          <Link href="/listings" className="text-[10px] text-amber-700 hover:underline mt-2 inline-block">Manage listings →</Link>
        </div>
        <Link href="/properties" className="text-xs text-emerald-700 hover:underline mt-3 inline-block">View properties →</Link>
      </SectionCard>

      {/* Section 3: Leasing & Renewals */}
      <SectionCard title="Leasing & Renewals" accent="#DBEAFE" icon={FileText}>
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="New (30d)" value={fmt(lease.new30d ?? 0)} tone="good" />
          <Kpi label="Renewed (30d)" value={fmt(lease.renewed30d ?? 0)} />
          <Kpi label="Upcoming 120d" value={fmt(lease.upcoming120 ?? 0)} tone="warn" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Kpi label="Pending Renewals" value={fmt(lease.pending ?? 0)} tone="warn" />
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Rental Mix</p>
            <div className="mt-2">
              <StackBar
                segments={[
                  { label: 'New',     value: lease.rentalMix?.new ?? 0,     color: '#10B981' },
                  { label: 'Renewed', value: lease.rentalMix?.renewed ?? 0, color: '#3B82F6' },
                  { label: 'Other',   value: lease.rentalMix?.other ?? 0,   color: '#9CA3AF' },
                ]}
              />
            </div>
          </div>
        </div>
        <Link href="/leases" className="text-xs text-blue-700 hover:underline mt-3 inline-block">View leases →</Link>
      </SectionCard>

      {/* Section 4: Financials & Revenue */}
      <SectionCard title="Financials & Revenue" accent="#FEE2E2" icon={DollarSign}>
        <div className="space-y-2">
          {/* PM Fee */}
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">PM Fee</p>
              <span className="text-[10px] text-gray-500">Last 30d</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700"><b>{aed(fin.pmFee?.collected ?? 0)}</b> collected</span>
              <span className="text-amber-700"><b>{aed(fin.pmFee?.pending ?? 0)}</b> pending</span>
            </div>
          </div>
          {/* Ejari Fee */}
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Ejari Fee</p>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700"><b>{aed(fin.ejariFee?.collected ?? 0)}</b> collected</span>
              <span className="text-amber-700"><b>{aed(fin.ejariFee?.uncollected ?? 0)}</b> uncollected</span>
            </div>
          </div>
          {/* Commissions */}
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Commissions</p>
            <div className="flex justify-between text-sm">
              <span><b className="text-gray-900">{aed(fin.commissions?.leasing ?? 0)}</b> <span className="text-gray-500">leasing</span></span>
              <span><b className="text-gray-400">{aed(fin.commissions?.sale ?? 0)}</b> <span className="text-gray-400">sale</span></span>
            </div>
          </div>
          {/* Total */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-amber-800">Total Collections (30d)</p>
              <TrendingUp className="w-3 h-3 text-amber-600" />
            </div>
            <p className="text-xl font-bold text-amber-900">{aed(fin.totalCollections?.total ?? 0)}</p>
            <div className="flex gap-3 mt-1 text-[10px] text-amber-700 flex-wrap">
              <span>Rental {aed(fin.totalCollections?.rental ?? 0)}</span>
              <span>·</span>
              <span>PM {aed(fin.totalCollections?.pm ?? 0)}</span>
              <span>·</span>
              <span>Comm {aed(fin.totalCollections?.commission ?? 0)}</span>
            </div>
          </div>
        </div>
        <Link href="/finance" className="text-xs text-red-700 hover:underline mt-3 inline-block">View finance →</Link>
      </SectionCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main page: master dashboard + legacy detail tabs
// ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('occupancy');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['report', activeReport, year, month],
    queryFn: () => api.get(`/reports/${activeReport}`, { params: { year, month } }),
  });

  const report: any = (data as any)?.data ?? data;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-amber-500" />
          Reports & Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time KPIs across operations, inventory, leasing and money. Refreshes every 60 seconds.
        </p>
      </div>

      <MasterDashboard />

      <div className="pt-4 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Detailed reports</h2>
        <div className="flex gap-1 border-b border-gray-200 mb-4 flex-wrap">
          {REPORT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveReport(t.key)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeReport === t.key
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeReport === 'revenue' && (
          <div className="flex gap-2 mb-3">
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="text-sm border border-gray-200 rounded px-2 py-1">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month ?? ''} onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : undefined)} className="text-sm border border-gray-200 rounded px-2 py-1">
              <option value="">All months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{new Date(2024, m - 1).toLocaleString('en-AE', { month: 'long' })}</option>)}
            </select>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <Card>
            <CardContent className="pt-5">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-auto">
                {JSON.stringify(report, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
