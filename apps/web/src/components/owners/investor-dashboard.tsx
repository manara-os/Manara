'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Building2, DollarSign, Percent } from 'lucide-react';
import { ownersApi } from '@/lib/api';

interface Props {
  ownerId: string;
  // optional pre-fetched portfolio (kept for backward compatibility with existing callers)
  portfolio?: any;
}

/**
 * InvestorDashboard
 *
 * Pulls /owners/:id/investor-dashboard — trailing-12-month real revenue & expense data
 * aggregated from RentCollection + Expense tables. No client-side synthesis.
 */
export function InvestorDashboard({ ownerId }: Props) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['investor-dashboard', ownerId],
    queryFn: () => ownersApi.getInvestorDashboard(ownerId) as Promise<any>,
    enabled: !!ownerId,
  });

  const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

  if (isLoading) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-gray-400">Loading investor dashboard…</CardContent></Card>
    );
  }

  if (!data || !data.properties?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No portfolio data yet.</p>
          <p className="text-xs text-gray-400 mt-1">Investor dashboard will populate after the first rent collection or expense is recorded.</p>
        </CardContent>
      </Card>
    );
  }

  const portfolio = data.portfolio;
  const rows = data.properties as any[];
  const monthly = data.monthly as any[];
  const yoy = data.yoy as any[];
  const heat = data.heatStrip as any[];
  const isPositive = portfolio.portfolioYieldPct >= 0;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-500 italic flex items-center gap-1.5">
        <Activity className="w-3 h-3" />
        Real numbers from the last 12 months of rent collections + expenses on the General Ledger.
      </p>

      {/* Investor KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold uppercase tracking-wide">
              <DollarSign className="w-3 h-3" /> Revenue (12m)
            </div>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{aed(portfolio.trailing12Revenue)}</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Trailing 12 months of rent</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-red-700 font-semibold uppercase tracking-wide">
              <TrendingDown className="w-3 h-3" /> Expenses (12m)
            </div>
            <p className="text-2xl font-bold text-red-800 mt-1">{aed(portfolio.trailing12Expenses)}</p>
            <p className="text-[10px] text-red-700 mt-0.5">Maintenance + utilities + service charge</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold uppercase tracking-wide">
              <TrendingUp className="w-3 h-3" /> NOI (12m)
            </div>
            <p className="text-2xl font-bold text-amber-800 mt-1">{aed(portfolio.netOperatingIncome)}</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Revenue − expenses</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${isPositive ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-red-50 to-pink-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${isPositive ? 'text-blue-700' : 'text-red-700'}`}>
              <Percent className="w-3 h-3" /> Portfolio yield
            </div>
            <p className={`text-2xl font-bold mt-1 ${isPositive ? 'text-blue-800' : 'text-red-800'}`}>{portfolio.portfolioYieldPct}%</p>
            <p className={`text-[10px] mt-0.5 ${isPositive ? 'text-blue-700' : 'text-red-700'}`}>
              Avg occupancy {portfolio.avgOccupancy}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-property breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            Asset-level breakdown
            <Badge variant="outline" className="text-[10px] ml-1">Trailing 12 months</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-5 py-2 font-medium text-xs uppercase">Property</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase text-right">Revenue (12m)</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase text-right">Expenses (12m)</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase text-right">NOI</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase text-right">Yield</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase text-right">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/properties/${r.id}`} className="text-amber-600 hover:underline font-medium">{r.name}</Link>
                      <p className="text-[10px] text-gray-500 mt-0.5">{r.area ?? ''}{r.area && r.city ? ', ' : ''}{r.city ?? ''} · {r.totalUnits} units</p>
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">{aed(r.trailing12Revenue)}</td>
                    <td className="px-5 py-2.5 text-right text-red-600">{aed(r.trailing12Expenses)}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-emerald-700">{aed(r.netOperatingIncome)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`font-bold ${r.noiYieldPct >= 6 ? 'text-emerald-700' : r.noiYieldPct >= 3 ? 'text-amber-700' : 'text-red-700'}`}>{r.noiYieldPct}%</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${r.occupancy >= 80 ? 'bg-emerald-500' : r.occupancy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.occupancy}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{r.occupancy}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-5 py-2.5 text-amber-900">Portfolio total</td>
                  <td className="px-5 py-2.5 text-right text-emerald-700">{aed(portfolio.trailing12Revenue)}</td>
                  <td className="px-5 py-2.5 text-right text-red-700">{aed(portfolio.trailing12Expenses)}</td>
                  <td className="px-5 py-2.5 text-right text-emerald-800">{aed(portfolio.netOperatingIncome)}</td>
                  <td className="px-5 py-2.5 text-right text-blue-700">{portfolio.portfolioYieldPct}%</td>
                  <td className="px-5 py-2.5 text-right text-amber-800">{portfolio.avgOccupancy}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly P&L + YoY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              Monthly P&L — trailing 12 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#expGrad)" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Year-over-year by quarter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={yoy}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="lastYear" fill="#94A3B8" name="Last year" />
                  <Bar dataKey="thisYear" fill="#D97706" name="This year" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy heat strip (real per-month from active leases) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Occupancy heat — last 12 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {heat.map((row: any) => (
              <div key={row.propertyId} className="flex items-center gap-3">
                <Link href={`/properties/${row.propertyId}`} className="w-40 truncate text-sm text-gray-700 hover:text-amber-600 hover:underline flex-shrink-0">
                  {row.name}
                </Link>
                <div className="flex-1 grid grid-cols-12 gap-px h-7 rounded overflow-hidden">
                  {row.months.map((m: any, i: number) => {
                    const occ = m.pct;
                    const color =
                      occ >= 80 ? '#10B981' :
                      occ >= 60 ? '#84CC16' :
                      occ >= 40 ? '#F59E0B' :
                      occ >= 20 ? '#F97316' :
                      '#EF4444';
                    return (
                      <div
                        key={i}
                        title={`${m.month}: ${m.occupied}/${m.total} units (${occ}%)`}
                        style={{ background: color, opacity: 0.6 + occ / 250 }}
                      />
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-gray-700 w-12 text-right">
                  {Math.round(row.months.reduce((s: number, m: any) => s + m.pct, 0) / row.months.length)}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10px] text-gray-500">
            <span className="font-semibold uppercase tracking-wide">Legend:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded" /> &lt;20%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded" /> 20-40%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded" /> 40-60%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-lime-500 rounded" /> 60-80%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded" /> 80%+</span>
            <span className="flex-1" />
            <span className="text-gray-400">As of {new Date(data.asOf).toLocaleDateString('en-AE')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
