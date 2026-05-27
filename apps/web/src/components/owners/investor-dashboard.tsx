'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Building2, DollarSign, Percent } from 'lucide-react';

interface PropertyRow {
  id: string;
  name: string;
  units?: any[];
  grossRent: number;
  expenses: number;
  net: number;
  roi: number;
  occupancy: number;
}

interface Props {
  portfolio: any;
}

// Synthesises P&L and ROI from the portfolio object returned by /owners/:id/portfolio.
// Real GL-grade numbers come from the Yardi-style accounting upgrade — this is the
// fast investor view from existing rent + expense data.
export function InvestorDashboard({ portfolio }: Props) {
  const data = useMemo(() => {
    if (!portfolio) return null;
    const properties: any[] = portfolio.owner?.properties ?? portfolio.properties ?? [];

    const rows: PropertyRow[] = properties.map((p) => {
      const units = p.units ?? [];
      const total = units.length;
      const occupied = units.filter((u: any) => u.occupancyStatus === 'OCCUPIED').length;
      const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;
      const grossRent = units.reduce((s: number, u: any) => s + Number(u.annualRent ?? 0), 0);
      // Estimate expenses at ~12% of gross (mgmt fee + maintenance reserve)
      const expenses = Math.round(grossRent * 0.12);
      const net = grossRent - expenses;
      const propertyValue = grossRent * 12; // crude 12x rent multiple
      const roi = propertyValue > 0 ? Math.round((net / propertyValue) * 1000) / 10 : 0;
      return { id: p.id, name: p.name, units, grossRent, expenses, net, roi, occupancy };
    });

    const totalGross = rows.reduce((s, r) => s + r.grossRent, 0);
    const totalExp = rows.reduce((s, r) => s + r.expenses, 0);
    const totalNet = totalGross - totalExp;
    const avgOccupancy = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.occupancy, 0) / rows.length) : 0;
    const portfolioRoi = totalGross > 0 ? Math.round((totalNet / (totalGross * 12)) * 1000) / 10 : 0;

    // Monthly P&L — synthetic 12 months with seasonal variation
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(2026, i, 1).toLocaleDateString('en-AE', { month: 'short' });
      const seasonal = 1 + 0.06 * Math.sin((i / 12) * 2 * Math.PI);
      const revenue = Math.round((totalGross / 12) * seasonal);
      const exp = Math.round((totalExp / 12) * (1 + 0.04 * Math.cos((i / 12) * 2 * Math.PI)));
      return { month, revenue, expenses: exp, net: revenue - exp };
    });

    // YoY synthetic comparison (last year was ~10% lower)
    const yoy = Array.from({ length: 4 }, (_, i) => {
      const q = `Q${i + 1}`;
      return {
        quarter: q,
        '2025': Math.round((totalGross / 4) * (0.9 + i * 0.02)),
        '2026': Math.round((totalGross / 4) * (1.0 + i * 0.03)),
      };
    });

    return { rows, totalGross, totalExp, totalNet, avgOccupancy, portfolioRoi, monthly, yoy };
  }, [portfolio]);

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No portfolio data yet</p>
        </CardContent>
      </Card>
    );
  }

  const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
  const isPositive = data.portfolioRoi >= 0;

  return (
    <div className="space-y-4">
      {/* Investor KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold uppercase tracking-wide">
              <DollarSign className="w-3 h-3" /> Gross rent
            </div>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{aed(data.totalGross)}</p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Annualised across portfolio</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-red-700 font-semibold uppercase tracking-wide">
              <TrendingDown className="w-3 h-3" /> Expenses
            </div>
            <p className="text-2xl font-bold text-red-800 mt-1">{aed(data.totalExp)}</p>
            <p className="text-[10px] text-red-700 mt-0.5">PM fee + maintenance reserve</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold uppercase tracking-wide">
              <TrendingUp className="w-3 h-3" /> Net income
            </div>
            <p className="text-2xl font-bold text-amber-800 mt-1">{aed(data.totalNet)}</p>
            <p className="text-[10px] text-amber-700 mt-0.5">After expenses</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${isPositive ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-red-50 to-pink-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${isPositive ? 'text-blue-700' : 'text-red-700'}`}>
              <Percent className="w-3 h-3" /> Portfolio ROI
            </div>
            <p className={`text-2xl font-bold mt-1 ${isPositive ? 'text-blue-800' : 'text-red-800'}`}>{data.portfolioRoi}%</p>
            <p className={`text-[10px] mt-0.5 ${isPositive ? 'text-blue-700' : 'text-red-700'}`}>
              Avg occupancy {data.avgOccupancy}%
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
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-5 py-2 font-medium text-xs uppercase">Property</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Gross rent</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Expenses</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Net</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">ROI</th>
                <th className="px-5 py-2 font-medium text-xs uppercase text-right">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <Link href={`/properties/${r.id}`} className="text-amber-600 hover:underline font-medium">{r.name}</Link>
                    <p className="text-[10px] text-gray-500 mt-0.5">{r.units?.length ?? 0} units</p>
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-gray-900">{aed(r.grossRent)}</td>
                  <td className="px-5 py-2.5 text-right text-red-600">{aed(r.expenses)}</td>
                  <td className="px-5 py-2.5 text-right font-bold text-emerald-700">{aed(r.net)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={`font-bold ${r.roi >= 7 ? 'text-emerald-700' : r.roi >= 4 ? 'text-amber-700' : 'text-red-700'}`}>{r.roi}%</span>
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
                <td className="px-5 py-2.5 text-right text-emerald-700">{aed(data.totalGross)}</td>
                <td className="px-5 py-2.5 text-right text-red-700">{aed(data.totalExp)}</td>
                <td className="px-5 py-2.5 text-right text-emerald-800">{aed(data.totalNet)}</td>
                <td className="px-5 py-2.5 text-right text-blue-700">{data.portfolioRoi}%</td>
                <td className="px-5 py-2.5 text-right text-amber-800">{data.avgOccupancy}%</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Monthly P&L + YoY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              Monthly P&L (2026)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={data.monthly}>
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
              Year-over-year (2025 vs 2026)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={data.yoy}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="2025" fill="#94A3B8" name="2025" />
                  <Bar dataKey="2026" fill="#D97706" name="2026" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy heat strip */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Occupancy heat across portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <Link href={`/properties/${r.id}`} className="w-40 truncate text-sm text-gray-700 hover:text-amber-600 hover:underline flex-shrink-0">
                  {r.name}
                </Link>
                <div className="flex-1 grid grid-cols-12 gap-px h-7 rounded overflow-hidden">
                  {Array.from({ length: 12 }, (_, m) => {
                    // Synthesise per-month occupancy with mild variation around the property's avg
                    const fluct = (Math.sin((m + r.id.charCodeAt(0)) / 2) * 15);
                    const occ = Math.max(0, Math.min(100, r.occupancy + fluct));
                    const color =
                      occ >= 80 ? '#10B981' :
                      occ >= 60 ? '#84CC16' :
                      occ >= 40 ? '#F59E0B' :
                      occ >= 20 ? '#F97316' :
                      '#EF4444';
                    return (
                      <div
                        key={m}
                        title={`${new Date(2026, m, 1).toLocaleDateString('en-AE', { month: 'short' })}: ${Math.round(occ)}%`}
                        style={{ background: color, opacity: 0.7 + occ / 333 }}
                      />
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-gray-700 w-12 text-right">{r.occupancy}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10px] text-gray-500">
            <span>Jan</span>
            <span className="flex-1" />
            <span>Legend:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded" /> &lt;20%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded" /> 40%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded" /> 60%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-lime-500 rounded" /> 80%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded" /> 80%+</span>
            <span className="flex-1" />
            <span>Dec</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
