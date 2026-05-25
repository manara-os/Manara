'use client';

import { useQuery } from '@tanstack/react-query';
import { financeApi } from '@/lib/api';
import { formatCurrency, formatDate, calculateDaysOverdue } from '@/lib/utils';
import Link from 'next/link';

export function OverdueTable() {
  const { data: overdueRaw, isLoading } = useQuery({
    queryKey: ['overdue-cheques'],
    queryFn: () => financeApi.getOverdue(),
    staleTime: 2 * 60 * 1000,
  });

  const overdue: any[] = Array.isArray(overdueRaw) ? overdueRaw : ((overdueRaw as any)?.data ?? []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!overdue?.length) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No overdue payments
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
            <th className="pb-2 font-medium">Tenant</th>
            <th className="pb-2 font-medium">Unit</th>
            <th className="pb-2 font-medium">Amount</th>
            <th className="pb-2 font-medium">Due Date</th>
            <th className="pb-2 font-medium">Days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
          {overdue.slice(0, 8).map((cheque: any) => (
            <tr key={cheque.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="py-2.5 font-medium text-gray-900 dark:text-white">
                {cheque.lease?.tenant?.fullName}
              </td>
              <td className="py-2.5 text-gray-600 dark:text-gray-400">
                {cheque.lease?.unit?.unitNumber} · {cheque.lease?.unit?.property?.name}
              </td>
              <td className="py-2.5 font-medium text-red-600">
                {formatCurrency(cheque.amount, 'AED')}
              </td>
              <td className="py-2.5 text-gray-500">
                {formatDate(cheque.dueDate)}
              </td>
              <td className="py-2.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {calculateDaysOverdue(cheque.dueDate)}d
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {overdue.length > 8 && (
        <Link href="/finance/overdue" className="block text-center mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium">
          View all {overdue.length} overdue →
        </Link>
      )}
    </div>
  );
}
