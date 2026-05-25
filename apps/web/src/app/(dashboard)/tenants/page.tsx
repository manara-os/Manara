'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Users, CheckCircle2, XCircle, Phone, Clock, AlertTriangle } from 'lucide-react';
import { tenantsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

export default function TenantsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search],
    queryFn: () => tenantsApi.list({ search }),
    staleTime: 60 * 1000,
  });

  const tenants = (data as any)?.data ?? (data as any) ?? [];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} tenants registered</p>
        </div>
        <Button asChild>
          <Link href="/tenants/new"><Plus className="w-4 h-4 mr-2" />Add Tenant</Link>
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-xs" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">KYC</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Expires</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {tenants.map((tenant: any) => (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {getInitials(tenant.fullName)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{tenant.fullName}</div>
                          <div className="text-xs text-gray-500">{tenant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{tenant.phone}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{tenant.nationality ?? '—'}</td>
                    <td className="px-6 py-3">
                      {tenant.kycVerified ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" />Verified</Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1"><XCircle className="w-3 h-3" />Pending</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {tenant.leases?.[0] ? `${tenant.leases[0].unit?.unitNumber} · ${tenant.leases[0].unit?.property?.name}` : '—'}
                    </td>
                    <td className="px-6 py-3">
                      {(() => {
                        const lease = tenant.leases?.[0];
                        if (!lease?.endDate) return <span className="text-gray-400 text-xs">—</span>;
                        const end = new Date(lease.endDate);
                        const today = new Date();
                        const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const expired = days < 0;
                        const expiringSoon = days >= 0 && days <= 90;
                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-600">{end.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {expired ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium"><AlertTriangle className="w-3 h-3" />Expired</span>
                            ) : expiringSoon ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium"><Clock className="w-3 h-3" />{days}d left</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">{days}d left</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-3">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/tenants/${tenant.id}`}>View</Link>
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
