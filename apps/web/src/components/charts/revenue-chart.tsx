'use client';

import { useQuery } from '@tanstack/react-query';
import { financeApi } from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildMonthlyData(year: number) {
  return MONTHS.map((month, i) => ({ month, revenue: 0, expenses: 0, net: 0, index: i + 1 }));
}

export function RevenueChart() {
  const year = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-chart', year],
    queryFn: () => financeApi.getRevenue({ year }),
    staleTime: 5 * 60 * 1000,
  });

  const chartData = buildMonthlyData(year).map((d) => {
    const monthData = (data as any)?.monthlyBreakdown?.find((m: any) => m.month === d.index);
    return {
      month: d.month,
      Revenue: monthData?.revenue ?? 0,
      Expenses: monthData?.expenses ?? 0,
      Net: monthData?.net ?? 0,
    };
  });

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">Loading chart...</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
          formatter={(value: number, name: string) => [formatCurrency(value, 'AED'), name]}
        />
        <Area type="monotone" dataKey="Revenue" stroke="#10B981" strokeWidth={2} fill="url(#colorRevenue)" />
        <Area type="monotone" dataKey="Expenses" stroke="#F59E0B" strokeWidth={2} fill="url(#colorExpenses)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
