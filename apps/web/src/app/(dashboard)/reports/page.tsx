'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Wrench, Home, FileText, DollarSign, TrendingUp, Sparkles, Users, Calendar, AlertOctagon, CheckCircle2 } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import { Badge } from '@/components/ui/badge';

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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time KPIs across operations, inventory, leasing and money. Refreshes every 60 seconds.
          </p>
        </div>
        <Link
          href="/reports/ai"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
        >
          <Sparkles className="w-4 h-4" />
          AI Intelligence Reports
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">NEW</span>
        </Link>
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
          <DetailedReportView type={activeReport} report={report} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Per-report visualisations
// ─────────────────────────────────────────────────────────────────────

function DetailedReportView({ type, report }: { type: ReportType; report: any }) {
  if (!report) return <Card><CardContent className="pt-5 text-sm text-gray-400">No data available</CardContent></Card>;

  switch (type) {
    case 'occupancy':   return <OccupancyView report={report} />;
    case 'revenue':     return <RevenueView report={report} />;
    case 'maintenance': return <MaintenanceView report={report} />;
    case 'tenants':     return <TenantsView report={report} />;
    case 'leases':      return <LeasesView report={report} />;
  }
}

const PIE_COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

function OccupancyView({ report }: { report: any }) {
  const summary = report?.summary ?? {};
  const units: any[] = report?.units ?? [];

  const pieData = [
    { name: 'Occupied',    value: summary.occupied ?? 0,    color: '#10B981' },
    { name: 'Vacant',      value: summary.vacant ?? 0,      color: '#F59E0B' },
    { name: 'Maintenance', value: summary.maintenance ?? 0, color: '#9CA3AF' },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Donut + summary */}
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle className="text-base">Occupancy breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-32 pointer-events-none">
            <p className="text-3xl font-bold text-gray-900">{summary.occupancyRate ?? 0}%</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Occupancy</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats column */}
      <Card>
        <CardHeader><CardTitle className="text-base">At a glance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            ['Total units', summary.total ?? 0, 'text-gray-900'],
            ['Occupied', summary.occupied ?? 0, 'text-emerald-600'],
            ['Vacant', summary.vacant ?? 0, 'text-amber-600'],
            ['Under maintenance', summary.maintenance ?? 0, 'text-gray-500'],
          ].map(([label, val, color]: any) => (
            <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
              <span className="text-sm text-gray-600">{label}</span>
              <span className={`text-lg font-bold ${color}`}>{val}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Vacant units list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-600" /> Vacant units
          </CardTitle>
        </CardHeader>
        <CardContent>
          {units.filter((u) => u.occupancyStatus === 'VACANT').length === 0 ? (
            <p className="text-xs text-gray-400">All units occupied 🎉</p>
          ) : (
            <ul className="space-y-1.5 max-h-44 overflow-y-auto">
              {units
                .filter((u) => u.occupancyStatus === 'VACANT')
                .slice(0, 10)
                .map((u) => (
                  <li key={u.id} className="text-xs flex justify-between items-center">
                    <span className="text-gray-700">
                      <b>{u.unitNumber}</b> · {u.property?.name}
                    </span>
                    <span className="text-amber-700 font-semibold">
                      {u.annualRent ? `AED ${Number(u.annualRent).toLocaleString()}` : '—'}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueView({ report }: { report: any }) {
  // Server returns { totalRevenue, collections: [{amount, collectedAt}], expenses: [...] }
  const totalRevenue = report?.totalRevenue ?? 0;
  const collections: any[] = report?.collections ?? [];
  const expenses: any[] = report?.expenses ?? [];
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const net = totalRevenue - totalExpenses;

  // Group collections by month
  const byMonth = new Map<string, { month: string; revenue: number; expenses: number }>();
  for (const c of collections) {
    const m = new Date(c.collectedAt).toLocaleDateString('en-AE', { month: 'short' });
    const row = byMonth.get(m) ?? { month: m, revenue: 0, expenses: 0 };
    row.revenue += Number(c.amount ?? 0);
    byMonth.set(m, row);
  }
  for (const e of expenses) {
    const m = new Date(e.expenseDate).toLocaleDateString('en-AE', { month: 'short' });
    const row = byMonth.get(m) ?? { month: m, revenue: 0, expenses: 0 };
    row.expenses += Number(e.amount ?? 0);
    byMonth.set(m, row);
  }
  const chartData = Array.from(byMonth.values());

  const expensesByCategory = expenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount ?? 0);
    return acc;
  }, {});
  const catData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value: value as number }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-emerald-50 border-0">
          <CardContent className="p-4">
            <p className="text-[10px] text-emerald-700 uppercase tracking-wide font-semibold">Revenue</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">AED {totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-0">
          <CardContent className="p-4">
            <p className="text-[10px] text-red-700 uppercase tracking-wide font-semibold">Expenses</p>
            <p className="text-2xl font-bold text-red-700 mt-1">AED {totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`${net >= 0 ? 'bg-blue-50' : 'bg-amber-50'} border-0`}>
          <CardContent className="p-4">
            <p className={`text-[10px] ${net >= 0 ? 'text-blue-700' : 'text-amber-700'} uppercase tracking-wide font-semibold`}>Net</p>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-blue-700' : 'text-amber-700'} mt-1`}>AED {net.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly cash flow</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                  <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {catData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Expenses by category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={catData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
                  <Bar dataKey="value" fill="#F59E0B" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MaintenanceView({ report }: { report: any }) {
  const summary = report?.summary ?? {};
  const byCategory: any[] = report?.byCategory ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Ticket status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">{summary.open ?? 0}</p>
              <p className="text-xs text-amber-600 mt-1">Open</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">{summary.resolved ?? 0}</p>
              <p className="text-xs text-emerald-600 mt-1">Resolved</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-700">{summary.pending ?? 0}</p>
              <p className="text-xs text-gray-600 mt-1">Pending</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{summary.total ?? 0}</p>
              <p className="text-xs text-blue-600 mt-1">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="text-xs text-gray-400">No tickets yet</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70}>
                    {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TenantsView({ report }: { report: any }) {
  const total = report?.total ?? 0;
  const kyc = report?.kycVerified ?? 0;
  const active = report?.withActiveLeases ?? 0;
  const overdue = report?.overdueCount ?? 0;

  const kycPct = total > 0 ? Math.round((kyc / total) * 100) : 0;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Tenant funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={[
                { stage: 'Registered',    count: total },
                { stage: 'KYC verified',  count: kyc },
                { stage: 'Active lease',  count: active },
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#D97706" name="Tenants" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Health indicators</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> KYC verified</span>
              <span className="font-bold text-emerald-700">{kyc} / {total} ({kycPct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${kycPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-600" /> Active lease</span>
              <span className="font-bold text-blue-700">{active} / {total} ({activePct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${activePct}%` }} />
            </div>
          </div>
          <div className={`rounded-lg p-3 ${overdue > 0 ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-center gap-2">
              <AlertOctagon className={`w-4 h-4 ${overdue > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
              <p className={`text-sm font-semibold ${overdue > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                {overdue > 0 ? `${overdue} tenant${overdue === 1 ? '' : 's'} overdue` : 'All paid up'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LeasesView({ report }: { report: any }) {
  const active = report?.active ?? 0;
  const expired = report?.expired ?? 0;
  const expiringSoon = report?.expiringSoon ?? 0;

  const data = [
    { status: 'Active',         count: active,        color: '#10B981' },
    { status: 'Expiring (90d)', count: expiringSoon,  color: '#F59E0B' },
    { status: 'Expired',        count: expired,       color: '#6B7280' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Lease pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Leases">
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Action required</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-emerald-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Active leases</p>
              <p className="text-xs text-emerald-600 mt-0.5">In force, generating rent</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{active}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Expiring in 90 days</p>
              <p className="text-xs text-amber-600 mt-0.5">Initiate renewal or screening</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{expiringSoon}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Expired</p>
              <p className="text-xs text-gray-500 mt-0.5">Lifetime archive</p>
            </div>
            <p className="text-2xl font-bold text-gray-700">{expired}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
