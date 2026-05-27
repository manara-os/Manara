'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowDownToLine, ArrowRight, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  vendor: any;
}

const TICKET_RATE_BY_CATEGORY: Record<string, number> = {
  PLUMBING: 450,
  ELECTRICAL: 380,
  AC_HVAC: 600,
  PAINTING: 550,
  PEST_CONTROL: 300,
  CLEANING: 200,
  CARPENTRY: 400,
  GENERAL: 350,
};

export function VendorWallet({ vendor }: Props) {
  const data = useMemo(() => {
    const tickets = vendor?.tickets ?? [];
    const completed = tickets.filter((t: any) => t.status === 'COMPLETED' || t.status === 'CLOSED');
    const inProgress = tickets.filter((t: any) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED');
    const cleared = completed.filter((t: any) => {
      // "Cleared" if completed more than 7 days ago
      const days = (Date.now() - new Date(t.updatedAt ?? t.createdAt).getTime()) / 86_400_000;
      return days >= 7;
    });
    const pending = completed.filter((t: any) => {
      const days = (Date.now() - new Date(t.updatedAt ?? t.createdAt).getTime()) / 86_400_000;
      return days < 7;
    });

    const rate = (t: any) => TICKET_RATE_BY_CATEGORY[t.category] ?? 350;
    const pendingTotal = pending.reduce((s: number, t: any) => s + rate(t), 0);
    const clearedTotal = cleared.reduce((s: number, t: any) => s + rate(t), 0);
    const inProgressEarning = inProgress.reduce((s: number, t: any) => s + rate(t), 0);

    // Last 12 weeks earnings (synthesised)
    const weeks: { week: string; earnings: number }[] = [];
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(Date.now() - w * 7 * 86_400_000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
      const inWeek = completed.filter((t: any) => {
        const d = new Date(t.updatedAt ?? t.createdAt);
        return d >= weekStart && d < weekEnd;
      });
      weeks.push({
        week: weekStart.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }),
        earnings: inWeek.reduce((s: number, t: any) => s + rate(t), 0),
      });
    }

    // Next payout = next Friday
    const today = new Date();
    const daysToFriday = (5 - today.getDay() + 7) % 7 || 7;
    const nextPayout = new Date(today.getTime() + daysToFriday * 86_400_000);

    return {
      inProgressCount: inProgress.length,
      inProgressEarning,
      pendingCount: pending.length,
      pendingTotal,
      clearedCount: cleared.length,
      clearedTotal,
      weeks,
      nextPayout,
      ytdTotal: completed.reduce((s: number, t: any) => s + rate(t), 0),
    };
  }, [vendor]);

  const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-3">
      {/* Hero balance */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 border-0 text-white">
        <CardContent className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Payable balance</p>
              <p className="text-4xl font-bold mt-1">{aed(data.clearedTotal)}</p>
              <p className="text-xs opacity-90 mt-1">{data.clearedCount} ticket{data.clearedCount === 1 ? '' : 's'} cleared · ready for payout</p>
            </div>
            <div className="text-right">
              <Calendar className="w-5 h-5 ml-auto opacity-80" />
              <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80 mt-1">Next auto-payout</p>
              <p className="text-sm font-bold">{data.nextPayout.toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <Button size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 mt-4">
            <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
            Request early payout
          </Button>
        </CardContent>
      </Card>

      {/* Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">In progress</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{aed(data.inProgressEarning)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{data.inProgressCount} ticket{data.inProgressCount === 1 ? '' : 's'} · earnings projected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">Pending clearance</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{aed(data.pendingTotal)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{data.pendingCount} completed · 7-day hold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">YTD total earnings</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{aed(data.ytdTotal)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-600" /> across all completed work</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Last 12 weeks · weekly earnings</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data.weeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => `AED ${Number(v).toLocaleString()}`} />
                <Bar dataKey="earnings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payout schedule */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <Wallet className="w-3.5 h-3.5" /> Payout policy
          </p>
          <ul className="text-xs text-blue-700 space-y-1 leading-relaxed">
            <li>• Tickets clear 7 days after marked COMPLETED (dispute window)</li>
            <li>• Cleared earnings auto-payout every <b>Friday</b> via bank transfer (UAE IBAN)</li>
            <li>• Early payout available on demand for <b>2% fee</b></li>
            <li>• No payout below AED 200 — accumulates to next cycle</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
