'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

type ReportType = 'occupancy' | 'revenue' | 'maintenance' | 'tenants' | 'leases';

const REPORT_TABS: { key: ReportType; label: string; icon: string }[] = [
  { key: 'occupancy', label: 'Occupancy', icon: '🏢' },
  { key: 'revenue', label: 'Revenue', icon: '💰' },
  { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { key: 'tenants', label: 'Tenants', icon: '👤' },
  { key: 'leases', label: 'Leases', icon: '📋' },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('occupancy');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['report', activeReport, year, month],
    queryFn: () => api.get(`/reports/${activeReport}`, { params: { year, month } }),
  });

  const report: any = data;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Reports & Analytics</h1>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month ?? ''}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleString('en-AE', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveReport(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeReport === tab.key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !report ? (
        <div className="text-center py-16 text-gray-400">No data available for this period.</div>
      ) : (
        <ReportContent type={activeReport} data={report} />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function ReportContent({ type, data }: { type: ReportType; data: any }) {
  if (type === 'occupancy') {
    const s = data.summary ?? {};
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Units" value={s.total} color="text-gray-900" />
          <StatCard label="Occupied" value={s.occupied} color="text-amber-600" />
          <StatCard label="Vacant" value={s.vacant} color="text-amber-500" />
          <StatCard label="Occupancy Rate" value={s.occupancyRate != null ? `${s.occupancyRate.toFixed(1)}%` : '—'} color="text-blue-600" />
        </div>
        {data.units?.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">Units Breakdown</CardTitle></CardHeader>
            <CardContent className="px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-500 text-xs">
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Annual Rent</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.units.map((u: any) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 font-medium text-sm">{u.unitNumber}</td>
                      <td className="py-2 text-xs text-gray-500">{u.type}</td>
                      <td className="py-2 text-right text-sm">AED {Number(u.annualRent ?? 0).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <Badge variant={u.occupancyStatus === 'OCCUPIED' ? 'success' : 'secondary'} className="text-[10px]">
                          {u.occupancyStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (type === 'revenue') {
    const s = data.summary ?? {};
    const monthly = data.monthlyBreakdown ?? [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Revenue" value={`AED ${Number(s.totalRevenue ?? 0).toLocaleString()}`} color="text-amber-600" />
          <StatCard label="Total Expenses" value={`AED ${Number(s.totalExpenses ?? 0).toLocaleString()}`} color="text-red-500" />
          <StatCard label="Net Income" value={`AED ${Number(s.netIncome ?? 0).toLocaleString()}`} color="text-green-600" />
        </div>
        {monthly.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle></CardHeader>
            <CardContent className="px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-500 text-xs">
                    <th className="pb-2 font-medium">Month</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                    <th className="pb-2 font-medium text-right">Expenses</th>
                    <th className="pb-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.filter((m: any) => m.revenue > 0 || m.expenses > 0).map((m: any) => (
                    <tr key={m.month} className="border-b last:border-0">
                      <td className="py-2 font-medium">{new Date(2024, m.month - 1).toLocaleString('en-AE', { month: 'long' })}</td>
                      <td className="py-2 text-right text-amber-600">AED {Number(m.revenue).toLocaleString()}</td>
                      <td className="py-2 text-right text-red-500">AED {Number(m.expenses).toLocaleString()}</td>
                      <td className="py-2 text-right font-medium">AED {Number(m.net).toLocaleString()}</td>
                    </tr>
                  ))}
                  {monthly.every((m: any) => m.revenue === 0 && m.expenses === 0) && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-xs">No transactions recorded for this period</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (type === 'maintenance') {
    const s = data.summary ?? {};
    const cats = data.byCategory ?? [];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tickets" value={s.total ?? 0} color="text-gray-900" />
          <StatCard label="Open" value={s.open ?? 0} color="text-blue-600" />
          <StatCard label="Resolved" value={s.resolved ?? 0} color="text-green-600" />
          <StatCard label="Pending" value={s.pending ?? 0} color="text-amber-600" />
        </div>
        {cats.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">By Category</CardTitle></CardHeader>
            <CardContent className="px-4">
              <div className="space-y-2">
                {cats.map((c: any) => (
                  <div key={c.category} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span className="text-sm text-gray-700">{c.category}</span>
                    <Badge variant="secondary" className="text-xs">{c.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (type === 'tenants') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tenants" value={data.total ?? 0} color="text-gray-900" />
        <StatCard label="KYC Verified" value={data.kycVerified ?? 0} color="text-green-600" />
        <StatCard label="With Active Leases" value={data.withActiveLeases ?? 0} color="text-amber-600" />
        <StatCard label="Overdue Cheques" value={data.overdueCount ?? 0} color="text-red-600" />
      </div>
    );
  }

  if (type === 'leases') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Leases" value={data.active ?? 0} color="text-green-600" />
        <StatCard label="Expired" value={data.expired ?? 0} color="text-red-500" />
        <StatCard label="Expiring in 90 Days" value={data.expiringSoon ?? 0} color="text-amber-600" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6">
        <pre className="text-xs text-gray-500 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </CardContent>
    </Card>
  );
}
