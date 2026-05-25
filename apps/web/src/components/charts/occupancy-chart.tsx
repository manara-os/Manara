'use client';

import { useQuery } from '@tanstack/react-query';
import { financeApi } from '@/lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  Occupied: '#10B981',
  Vacant: '#F59E0B',
  Maintenance: '#EF4444',
};

export function OccupancyChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.getSummary(),
    staleTime: 60 * 1000,
  });

  const d = data as any;
  const chartData = [
    { name: 'Occupied', value: (d?.totalUnits ?? 0) - (d?.vacantUnits ?? 0) },
    { name: 'Vacant', value: d?.vacantUnits ?? 0 },
  ].filter(item => item.value > 0);

  if (isLoading || chartData.length === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-amber-600">
          {d?.occupancyRate ?? '--'}%
        </div>
        <div className="text-sm text-gray-500 mt-1">Occupancy Rate</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-3xl font-bold text-amber-600 mb-1">{d?.occupancyRate ?? 0}%</div>
      <div className="text-xs text-gray-500 mb-2">Occupancy Rate</div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] ?? '#e5e7eb'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
            formatter={(value: number, name: string) => [`${value} units`, name]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
