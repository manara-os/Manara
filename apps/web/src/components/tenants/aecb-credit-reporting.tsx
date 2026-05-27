'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, TrendingUp, ShieldCheck, Info, CheckCircle2, Calendar, Sparkles, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import { aecbApi } from '@/lib/api';

interface Props {
  tenantName: string;
  tenantId?: string;
}

const monthlyHistory = [
  { month: 'Dec', score: 680, paidOnTime: true },
  { month: 'Jan', score: 695, paidOnTime: true },
  { month: 'Feb', score: 712, paidOnTime: true },
  { month: 'Mar', score: 724, paidOnTime: true },
  { month: 'Apr', score: 738, paidOnTime: true },
  { month: 'May', score: 752, paidOnTime: true },
];

export function AecbCreditReporting({ tenantName, tenantId }: Props) {
  const qc = useQueryClient();
  const [agreed, setAgreed] = useState(true);

  const { data: api } = useQuery({
    queryKey: ['aecb', tenantId],
    queryFn: () => aecbApi.history(tenantId!) as Promise<any>,
    enabled: !!tenantId,
  });

  const [localOptIn, setLocalOptIn] = useState(true);
  const optedIn = api?.optedIn ?? localOptIn;
  const currentScore = api?.currentScore ?? monthlyHistory[monthlyHistory.length - 1].score;
  const startScore = monthlyHistory[0].score;
  const delta = currentScore - startScore;

  const optInMutation = useMutation({
    mutationFn: (val: boolean) => aecbApi.optIn(tenantId!, val),
    onSuccess: (_, val) => {
      qc.invalidateQueries({ queryKey: ['aecb', tenantId] });
      if (val) toast.success('Opted in · Manara will report your on-time rent payments to AECB monthly');
      else toast.info('Opted out · no future rent payments will be shared with AECB');
    },
  });

  const toggleOptIn = (val: boolean) => {
    if (tenantId) optInMutation.mutate(val);
    else {
      setLocalOptIn(val);
      if (val) toast.success('Opted in · Manara will report your on-time rent payments to AECB monthly');
      else toast.info('Opted out · no future rent payments will be shared with AECB');
    }
  };

  return (
    <Card className="border-indigo-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            AECB credit reporting
            <Badge variant="outline" className="text-[10px] ml-1 border-indigo-300 text-indigo-700">
              Build your credit score
            </Badge>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{optedIn ? 'Reporting active' : 'Opted out'}</span>
            <button
              onClick={() => toggleOptIn(!optedIn)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${optedIn ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${optedIn ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {optedIn ? (
          <>
            {/* Score card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50/60 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold">Your AECB score</p>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="text-3xl font-bold text-indigo-900">{currentScore}</p>
                    <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" /> +{delta} pts in 6 months
                    </p>
                  </div>
                  <p className="text-xs text-indigo-700 mt-1">
                    Excellent — top 18% of UAE renters
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Tier</p>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 mt-1">Excellent (750+)</Badge>
                  <p className="text-[10px] text-gray-500 mt-1">Range: 300-900</p>
                </div>
              </div>

              {/* Mini chart */}
              <div className="mt-3 pt-3 border-t border-indigo-100/60">
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={monthlyHistory} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={[640, 800]} />
                    <Tooltip
                      contentStyle={{ fontSize: 10, borderRadius: 6, padding: 4 }}
                      formatter={(v: number) => [`Score: ${v}`, '']}
                    />
                    <ReferenceLine y={750} stroke="#10B981" strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366F1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Benefits unlocked */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Unlocked with your score</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: 'Lower car loan rates', desc: 'You qualify for the best tier (3.49% APR)', emoji: '🚗' },
                  { title: 'Higher CC limit', desc: 'Eligible for AED 50K+ credit card', emoji: '💳' },
                  { title: 'Mortgage pre-approval', desc: 'Down payment ratio 15% (vs 25% standard)', emoji: '🏠' },
                  { title: 'Premium tenant fast-track', desc: 'Skip security deposit on next lease', emoji: '⚡' },
                ].map((b) => (
                  <div key={b.title} className="bg-white border border-gray-100 rounded-lg p-2.5 flex items-start gap-2">
                    <span className="text-base flex-shrink-0">{b.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{b.title}</p>
                      <p className="text-[10px] text-gray-500 leading-tight">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent reports */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Recent reports submitted</p>
              {monthlyHistory.slice(-3).reverse().map((m) => (
                <div key={m.month} className="flex items-center justify-between p-2 rounded-lg border border-emerald-100 bg-emerald-50/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-gray-700">{m.month} 2026 rent — Paid on time</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono">Reported to AECB</span>
                </div>
              ))}
            </div>

            {/* AI insight */}
            <div className="bg-purple-50/60 rounded-lg p-3 border-l-2 border-purple-300 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-purple-700">AI insight</p>
                <p className="text-xs text-purple-900 mt-0.5 leading-relaxed">
                  At this growth rate, you'll cross 800 (Top tier) within 4 months. Set up auto-pay for utilities to accelerate by another 30-40 pts/year.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 leading-tight">
              Manara is an authorised reporting member of the UAE Al Etihad Credit Bureau (AECB). Only on-time payments improve your score · late/missed payments are not reported by default unless overdue 60+ days. <a href="#" className="underline">View full disclosure</a>
            </p>
          </>
        ) : (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Build your UAE credit score with on-time rent</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                Opt in and Manara will report your on-time rent payments to AECB — the UAE's official credit bureau. Tenants typically see +60 pts in 6 months. Free for you · no impact on missed-payment risk.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <input
                id="aecb-agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="aecb-agree" className="text-xs text-gray-600">
                I authorise Manara to share my on-time rent payment data with AECB
              </label>
            </div>
            <Button onClick={() => toggleOptIn(true)} disabled={!agreed} className="bg-indigo-600 hover:bg-indigo-700">
              Opt in to credit reporting <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
