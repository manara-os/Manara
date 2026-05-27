'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Star, Zap, TrendingUp, TrendingDown, Award, Crown } from 'lucide-react';
import Link from 'next/link';
import { vendorScoresApi } from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  prevRank?: number;
  vendorId: string;
  vendorName: string;
  category: string;
  jobsCompleted: number;
  avgRating: number;
  avgResponseHours: number;
  reworkRate: number;     // %
  slaCompliance: number;  // %
  totalEarned: number;
  score: number;          // composite 0-100
  badges: string[];
}

const seedLeaderboard = (): LeaderboardEntry[] => [
  { rank: 1, prevRank: 2, vendorId: 'v1', vendorName: 'CoolBreeze HVAC LLC', category: 'AC_HVAC',
    jobsCompleted: 247, avgRating: 4.85, avgResponseHours: 2.4, reworkRate: 1.2, slaCompliance: 98,
    totalEarned: 124_800, score: 96, badges: ['Top performer', 'Lightning response', 'Zero rework Q1'] },
  { rank: 2, prevRank: 1, vendorId: 'v2', vendorName: 'AquaFix Plumbers', category: 'PLUMBING',
    jobsCompleted: 189, avgRating: 4.72, avgResponseHours: 3.1, reworkRate: 2.4, slaCompliance: 95,
    totalEarned: 89_640, score: 92, badges: ['Top rated', 'High volume'] },
  { rank: 3, prevRank: 4, vendorId: 'v3', vendorName: 'Premium Paints DXB', category: 'PAINTING',
    jobsCompleted: 76, avgRating: 4.68, avgResponseHours: 6.8, reworkRate: 1.8, slaCompliance: 94,
    totalEarned: 56_200, score: 88, badges: ['Quality champion'] },
  { rank: 4, prevRank: 3, vendorId: 'v4', vendorName: 'BrightSpark Electric', category: 'ELECTRICAL',
    jobsCompleted: 134, avgRating: 4.55, avgResponseHours: 4.2, reworkRate: 3.1, slaCompliance: 91,
    totalEarned: 67_350, score: 84, badges: ['Reliable'] },
  { rank: 5, prevRank: 6, vendorId: 'v5', vendorName: 'Sparkle Pro Cleaning', category: 'CLEANING',
    jobsCompleted: 312, avgRating: 4.42, avgResponseHours: 8.4, reworkRate: 2.9, slaCompliance: 89,
    totalEarned: 78_960, score: 79, badges: ['Most jobs'] },
  { rank: 6, prevRank: 5, vendorId: 'v6', vendorName: 'PestAway Solutions', category: 'PEST_CONTROL',
    jobsCompleted: 58, avgRating: 4.38, avgResponseHours: 12.6, reworkRate: 4.2, slaCompliance: 86,
    totalEarned: 24_180, score: 74, badges: [] },
  { rank: 7, prevRank: 8, vendorId: 'v7', vendorName: 'PolarFix AC Services', category: 'AC_HVAC',
    jobsCompleted: 132, avgRating: 4.25, avgResponseHours: 7.8, reworkRate: 5.4, slaCompliance: 82,
    totalEarned: 52_440, score: 68, badges: [] },
  { rank: 8, prevRank: 7, vendorId: 'v8', vendorName: 'QuickFix Maintenance', category: 'GENERAL',
    jobsCompleted: 412, avgRating: 3.92, avgResponseHours: 14.2, reworkRate: 8.1, slaCompliance: 74,
    totalEarned: 84_280, score: 58, badges: ['Volume — but quality dropping'] },
];

const CATEGORY_LABELS: Record<string, string> = {
  AC_HVAC: 'AC/HVAC', PLUMBING: 'Plumbing', PAINTING: 'Painting', ELECTRICAL: 'Electrical',
  CLEANING: 'Cleaning', PEST_CONTROL: 'Pest control', GENERAL: 'General',
};

export function VendorLeaderboard() {
  const [period, setPeriod] = useState<'30D' | '90D' | 'YTD'>('90D');

  const { data: apiData = [] } = useQuery({
    queryKey: ['vendor-scores', period],
    queryFn: () => vendorScoresApi.leaderboard(period) as Promise<any[]>,
  });

  const data: LeaderboardEntry[] = (apiData.length ? apiData : seedLeaderboard()).map((v: any, i: number): LeaderboardEntry => ({
    rank: v.rank ?? i + 1,
    prevRank: v.prevRank,
    vendorId: v.vendor?.id ?? v.vendorId,
    vendorName: v.vendor?.companyName ?? v.vendorName,
    category: v.vendor?.serviceCategories?.[0] ?? v.category ?? 'GENERAL',
    jobsCompleted: v.jobsCompleted,
    avgRating: Number(v.avgRating),
    avgResponseHours: Number(v.avgResponseHours),
    reworkRate: Number(v.reworkRatePct ?? v.reworkRate ?? 0),
    slaCompliance: Number(v.slaCompliancePct ?? v.slaCompliance ?? 0),
    totalEarned: Number(v.totalEarnedAed ?? v.totalEarned ?? 0),
    score: Number(v.compositeScore ?? v.score ?? 0),
    badges: v.badges ?? [],
  }));

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-orange-600" />;
    return <span className="text-xs font-bold text-gray-400">#{rank}</span>;
  };

  const rankDelta = (current: number, prev?: number) => {
    if (!prev || prev === current) return null;
    const up = prev > current;
    return (
      <span className={`text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'} flex items-center gap-0.5`}>
        {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
        {Math.abs(prev - current)}
      </span>
    );
  };

  return (
    <Card className="border-amber-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Vendor performance leaderboard
            <Badge variant="outline" className="text-[10px] ml-1">Top 8 of 47</Badge>
          </span>
          <div className="flex gap-1">
            {(['30D', '90D', 'YTD'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-[11px] px-2 py-1 rounded-md font-medium transition-all ${
                  period === p ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2.5 text-xs font-medium uppercase">Rank</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase">Vendor</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase">Category</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase text-right">Jobs</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase text-right">Rating</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase text-right">Avg ETA</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase text-right">Rework</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase text-right">SLA</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((v) => (
                <tr key={v.vendorId} className="hover:bg-amber-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {rankIcon(v.rank)}
                      {rankDelta(v.rank, v.prevRank)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/vendors/${v.vendorId}`} className="font-medium text-gray-900 hover:text-amber-600">
                      {v.vendorName}
                    </Link>
                    {v.badges.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {v.badges.slice(0, 2).map((b) => (
                          <span key={b} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{CATEGORY_LABELS[v.category]}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{v.jobsCompleted}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-0.5 text-xs">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{v.avgRating.toFixed(2)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className={`font-medium ${v.avgResponseHours < 4 ? 'text-emerald-600' : v.avgResponseHours > 10 ? 'text-red-500' : 'text-gray-700'}`}>
                      {v.avgResponseHours.toFixed(1)}h
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className={`font-medium ${v.reworkRate < 2 ? 'text-emerald-600' : v.reworkRate > 5 ? 'text-red-500' : 'text-amber-600'}`}>
                      {v.reworkRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className={`font-medium ${v.slaCompliance >= 95 ? 'text-emerald-600' : v.slaCompliance < 80 ? 'text-red-500' : 'text-amber-600'}`}>
                      {v.slaCompliance}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${v.score >= 90 ? 'bg-emerald-500' : v.score >= 75 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${v.score}%` }}
                        />
                      </div>
                      <span className="font-bold text-sm text-gray-900 w-7 text-right">{v.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t bg-gray-50/50 text-[10px] text-gray-500 leading-relaxed">
          Score = weighted blend of completion volume (15%), rating (30%), response speed (20%), rework rate (20%), SLA compliance (15%). Top 3 vendors get priority on new bid invites · vendors below score 70 receive auto-warning emails.
        </div>
      </CardContent>
    </Card>
  );
}
