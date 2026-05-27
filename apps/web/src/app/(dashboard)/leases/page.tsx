'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, FileText, Calendar, AlertCircle } from 'lucide-react';
import { leasesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, getLeaseStatusColor } from '@/lib/utils';
import Link from 'next/link';

export default function LeasesPage() {
  const [status, setStatus] = useState('ACTIVE');
  const [search, setSearch] = useState('');

  // Map UI status → DB enum (DB uses PENDING_EJARI but UI shows "Pending")
  const dbStatus = status === 'PENDING' ? 'PENDING_EJARI' : status;

  const { data, isLoading } = useQuery({
    queryKey: ['leases', dbStatus],
    queryFn: () => leasesApi.list({ status: dbStatus }),
    staleTime: 60 * 1000,
  });

  const leases = (data as any)?.data ?? (data as any) ?? [];

  const statusOptions = ['ACTIVE', 'PENDING', 'EXPIRED', 'TERMINATED'];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Leases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leases.length} {status.toLowerCase()} leases</p>
        </div>
        <Button asChild>
          <Link href="/leases/new"><Plus className="w-4 h-4 mr-2" />New Lease</Link>
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-4">
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s ? 'bg-amber-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Expiring Soon Alert */}
      {status === 'ACTIVE' && (
        <ExpiringAlert />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Annual Rent</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Start</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">End</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ejari</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {leases.map((lease: any) => {
                  const daysLeft = lease.endDate ? Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <tr key={lease.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{lease.tenant?.fullName}</td>
                      <td className="px-5 py-3 text-gray-500">{lease.unit?.unitNumber} · {lease.unit?.property?.name}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(lease.annualRent, lease.currencyCode)}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(lease.startDate)}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        <div className="flex items-center gap-1">
                          {formatDate(lease.endDate)}
                          {daysLeft !== null && daysLeft <= 90 && daysLeft > 0 && (
                            <Badge variant="warning" className="text-xs ml-1">{daysLeft}d</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {lease.ejariNumber ? (
                          <Badge variant="success" className="text-xs">Registered</Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">Pending</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={lease.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">{lease.status}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/leases/${lease.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function ExpiringAlert() {
  const { data } = useQuery({
    queryKey: ['leases-expiring-90'],
    queryFn: () => leasesApi.getExpiring(90),
    staleTime: 5 * 60 * 1000,
  });

  const expiring = (data as any)?.data ?? (data as any) ?? [];
  if (!expiring.length) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4 text-sm text-amber-700 dark:text-amber-400">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{expiring.length} lease{expiring.length > 1 ? 's' : ''} expiring within 90 days</span>
      <Link href="/leases?status=ACTIVE&expiring=90" className="underline ml-auto text-xs font-medium">View →</Link>
    </div>
  );
}
