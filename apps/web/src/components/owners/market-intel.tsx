'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Building2 } from 'lucide-react';
import { ownersApi } from '@/lib/api';
import Link from 'next/link';

interface Props {
  ownerId: string;
  portfolio?: any; // kept for backward compatibility — not used
}

const RECOMMENDATION_META: Record<string, { label: string; color: string; bg: string }> = {
  BELOW_MARKET_RAISE: { label: 'Below market — raise on renewal', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  SLIGHTLY_BELOW:     { label: 'Slightly below market',           color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'   },
  AT_MARKET:          { label: 'At market',                       color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'     },
  ABOVE_MARKET_HOLD:  { label: 'Above market — hold rent',        color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200'     },
};

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-AE')}`;

/**
 * MarketIntel
 *
 * Fetches /owners/:id/market-intel — for every unit compares current rent vs RERA
 * Smart-Rent index (real data from ReraIndexCache table) and against same
 * area/type/bedroom peers in the workspace.
 */
export function MarketIntel({ ownerId }: Props) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['market-intel', ownerId],
    queryFn: () => ownersApi.getMarketIntel(ownerId) as Promise<any>,
    enabled: !!ownerId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-400">Loading market intel…</CardContent>
      </Card>
    );
  }

  if (!data?.units?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Market intel
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-gray-500">No units to benchmark yet.</p>
        </CardContent>
      </Card>
    );
  }

  const units = data.units as any[];
  const insights = data.insights ?? {};

  return (
    <Card className="border-blue-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Market intel
            <Badge variant="outline" className="text-[10px] ml-1">
              RERA + workspace peers · {data.reraIndexSize} index rows
            </Badge>
          </span>
          <span className="text-[10px] text-gray-400 italic">
            Refreshed {new Date(data.asOf).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insights bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label="Below market"  value={insights.belowMarketCount ?? 0}  tone="emerald" sub={`Uplift potential ${aed(insights.upliftOpportunityAed ?? 0)}`} />
          <Kpi label="At market"     value={insights.atMarketCount ?? 0}     tone="blue" />
          <Kpi label="Above market"  value={insights.aboveMarketCount ?? 0}  tone="rose" />
          <Kpi label="Units priced"  value={units.length}                    tone="gray" sub={`across ${new Set(units.map(u => u.propertyId)).size} properties`} />
        </div>

        {/* Per-unit table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-3 py-2 text-xs font-medium uppercase">Property · Unit</th>
                <th className="px-3 py-2 text-xs font-medium uppercase">Area · Type · Beds</th>
                <th className="px-3 py-2 text-xs font-medium uppercase text-right">Current</th>
                <th className="px-3 py-2 text-xs font-medium uppercase text-right">RERA min / avg / max</th>
                <th className="px-3 py-2 text-xs font-medium uppercase text-right">vs RERA</th>
                <th className="px-3 py-2 text-xs font-medium uppercase">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {units.map((u: any) => {
                const rec = u.recommendation && RECOMMENDATION_META[u.recommendation];
                return (
                  <tr key={u.unitId} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <Link href={`/properties/${u.propertyId}`} className="text-amber-600 hover:underline font-medium">
                        {u.propertyName}
                      </Link>
                      <p className="text-[10px] text-gray-500">Unit {u.unitNumber}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">
                      {u.area ?? '—'} · {u.propertyType?.toLowerCase()} · {u.bedroomCount ?? '—'}BR
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{aed(u.currentAnnualRent)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-600">
                      {u.rera ? (
                        <>
                          {(u.rera.min / 1000).toFixed(0)}k · <span className="font-bold text-gray-900">{(u.rera.avg / 1000).toFixed(0)}k</span> · {(u.rera.max / 1000).toFixed(0)}k
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No RERA data</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {u.rera?.vsAvgPct != null ? (
                        <span className={`font-bold inline-flex items-center gap-0.5 ${
                          u.rera.vsAvgPct >= 3 ? 'text-rose-600' : u.rera.vsAvgPct <= -3 ? 'text-emerald-700' : 'text-gray-600'
                        }`}>
                          {u.rera.vsAvgPct > 0 ? <TrendingUp className="w-3 h-3" /> : u.rera.vsAvgPct < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          {u.rera.vsAvgPct > 0 ? '+' : ''}{u.rera.vsAvgPct}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {rec && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${rec.bg} ${rec.color}`}>
                          {rec.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Per-unit peers expansion (only for units below market — most actionable) */}
        {units.filter(u => u.recommendation === 'BELOW_MARKET_RAISE' && u.peers?.length).length > 0 && (
          <details>
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
              <Building2 className="w-3 h-3 inline mr-1" />
              View peer comparables for below-market units
            </summary>
            <div className="mt-3 space-y-3">
              {units.filter(u => u.recommendation === 'BELOW_MARKET_RAISE' && u.peers?.length).map((u: any) => (
                <div key={u.unitId} className="bg-emerald-50/40 rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs font-semibold text-gray-900">
                    {u.propertyName} · Unit {u.unitNumber}
                    <span className="text-emerald-700 ml-2">(currently {(u.rera?.vsAvgPct ?? 0)}% vs RERA avg)</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 mb-2">Same area / type / bedrooms in your portfolio:</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {u.peers.map((p: any) => (
                      <Link key={p.unitId} href={`/units/${p.unitId}`} className="bg-white rounded p-2 border border-gray-100 hover:border-emerald-300 hover:shadow-sm">
                        <p className="text-[10px] font-medium text-gray-900 truncate">{p.propertyName}</p>
                        <p className="text-[9px] text-gray-500">Unit {p.unitNumber}</p>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5">{aed(p.annualRent)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        <p className="text-[10px] text-gray-400 leading-tight">
          RERA Smart Rent Index data refreshed from the regulator · per-unit comparables drawn from your own portfolio. UAE law caps annual rent increases at 20% (with sliding scale based on % below market).
        </p>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone: 'emerald' | 'blue' | 'rose' | 'gray' }) {
  const palette: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue:    'bg-blue-50    text-blue-700    border-blue-100',
    rose:    'bg-rose-50    text-rose-700    border-rose-100',
    gray:    'bg-gray-50    text-gray-700    border-gray-100',
  };
  return (
    <div className={`rounded-lg p-2.5 border ${palette[tone]}`}>
      <p className="text-[10px] uppercase tracking-wide font-bold">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-[10px] mt-0.5 opacity-80 truncate">{sub}</p>}
    </div>
  );
}
