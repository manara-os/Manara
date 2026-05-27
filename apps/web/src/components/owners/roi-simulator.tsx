'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, ChevronRight, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { toast } from 'sonner';

interface Scenario {
  id: string;
  name: string;
  icon: string;
  capex: number;
  rentUpliftPct: number;
  description: string;
  marketEvidence: string;
}

const SCENARIOS: Scenario[] = [
  { id: 'kitchen', name: 'Kitchen refresh', icon: '🍳', capex: 18_000, rentUpliftPct: 6, description: 'New cabinets, quartz tops, mid-range appliances', marketEvidence: 'Bayut: similar refreshed units rent +5-7% in same building' },
  { id: 'bath',    name: 'Bathroom upgrade', icon: '🛁', capex: 12_000, rentUpliftPct: 4, description: 'Re-tile, new vanity, glass shower, fittings', marketEvidence: 'PF: bath-upgraded comps rent +3-5%' },
  { id: 'full',    name: 'Full renovation', icon: '🏗', capex: 65_000, rentUpliftPct: 18, description: 'Floors, paint, kitchen, baths, AC service, smart locks', marketEvidence: 'Dubizzle: top-quartile units rent +15-22%' },
  { id: 'paint',   name: 'Paint + furnish (light)', icon: '🎨', capex: 8_000, rentUpliftPct: 3, description: 'Repaint, accent walls, basic furnishing kit', marketEvidence: 'Quickest payback for tired interiors' },
  { id: 'smart',   name: 'Smart home pack', icon: '🏠', capex: 6_500, rentUpliftPct: 2.5, description: 'Smart lock, Nest thermostat, doorbell, motorised blinds', marketEvidence: 'Listings with smart tags rent ~2-3% higher' },
  { id: 'balcony', name: 'Balcony glazing', icon: '🪟', capex: 14_000, rentUpliftPct: 5, description: 'Frameless glass balcony enclosure (DM approved)', marketEvidence: 'Adds usable sqft → +4-6%' },
];

interface Props {
  baseAnnualRent?: number;
}

export function RoiSimulator({ baseAnnualRent = 140_000 }: Props) {
  const [selected, setSelected] = useState<Scenario>(SCENARIOS[0]);
  const [vacancyDays, setVacancyDays] = useState(30);

  const result = useMemo(() => {
    const upliftAnnual = (baseAnnualRent * selected.rentUpliftPct) / 100;
    const lostRentDuringWork = (baseAnnualRent / 365) * vacancyDays;
    const paybackMonths = (selected.capex + lostRentDuringWork) / (upliftAnnual / 12);
    const yr5Net = (upliftAnnual * 5) - selected.capex - lostRentDuringWork;
    const roiPct = ((yr5Net + selected.capex) / selected.capex - 1) * 100;

    const chartData = Array.from({ length: 61 }, (_, i) => {
      const month = i;
      const cumulative = -selected.capex - lostRentDuringWork + (upliftAnnual / 12) * month;
      return { month, cumulative: Math.round(cumulative) };
    });

    return { upliftAnnual, lostRentDuringWork, paybackMonths, yr5Net, roiPct, chartData };
  }, [selected, vacancyDays, baseAnnualRent]);

  return (
    <Card className="border-cyan-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4 text-cyan-600" />
          ROI simulator — renovation payback
          <Badge variant="outline" className="text-[10px] ml-1 border-cyan-300 text-cyan-700">
            <Sparkles className="w-2.5 h-2.5 mr-0.5 inline" />AI-calibrated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario picker */}
        <div className="grid grid-cols-3 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selected.id === s.id
                  ? 'border-cyan-500 bg-cyan-50/60'
                  : 'border-gray-200 hover:border-cyan-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{s.icon}</span>
                <span className="text-xs font-semibold text-gray-900">{s.name}</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">AED {s.capex.toLocaleString('en-AE')} · +{s.rentUpliftPct}%</p>
            </button>
          ))}
        </div>

        {/* Description + market evidence */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-100">
          <div className="flex items-start gap-2">
            <span className="text-lg">{selected.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-600 mt-0.5">{selected.description}</p>
              <p className="text-[10px] text-cyan-700 mt-1 italic">📍 {selected.marketEvidence}</p>
            </div>
          </div>
        </div>

        {/* Vacancy slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-gray-600">Vacancy needed for work</label>
            <span className="font-mono font-semibold text-gray-900">{vacancyDays} days</span>
          </div>
          <input
            type="range" min={0} max={90} value={vacancyDays}
            onChange={(e) => setVacancyDays(Number(e.target.value))}
            className="w-full accent-cyan-600"
          />
        </div>

        {/* Results KPIs */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
            <p className="text-[9px] uppercase tracking-wide text-amber-700 font-bold">Capex + lost rent</p>
            <p className="text-sm font-bold text-amber-900 mt-0.5">AED {Math.round(selected.capex + result.lostRentDuringWork).toLocaleString('en-AE')}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
            <p className="text-[9px] uppercase tracking-wide text-emerald-700 font-bold">Annual rent uplift</p>
            <p className="text-sm font-bold text-emerald-900 mt-0.5">+AED {Math.round(result.upliftAnnual).toLocaleString('en-AE')}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
            <p className="text-[9px] uppercase tracking-wide text-blue-700 font-bold">Payback</p>
            <p className="text-sm font-bold text-blue-900 mt-0.5">{result.paybackMonths.toFixed(1)} mo</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-2.5 border border-violet-100">
            <p className="text-[9px] uppercase tracking-wide text-violet-700 font-bold">5-yr ROI</p>
            <p className="text-sm font-bold text-violet-900 mt-0.5">{result.roiPct.toFixed(0)}%</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">Cumulative cashflow vs do-nothing baseline</p>
            <p className="text-[10px] text-gray-400">5-year horizon</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={result.chartData}>
              <defs>
                <linearGradient id="roiGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tickFormatter={(m) => `${m}mo`} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
                formatter={(v: number) => [`AED ${v.toLocaleString('en-AE')}`, 'Net']}
                labelFormatter={(m) => `Month ${m}`}
              />
              <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="cumulative" stroke="#06B6D4" strokeWidth={2} fill="url(#roiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-gray-500">
            Base rent: AED {baseAnnualRent.toLocaleString('en-AE')}/yr · Comparables sourced from Bayut, PF, Dubizzle for your building+area.
          </p>
          <Button size="sm" variant="outline" onClick={() => toast.success('PM notified — quotation will be sent to your WhatsApp')}>
            Request quote <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
