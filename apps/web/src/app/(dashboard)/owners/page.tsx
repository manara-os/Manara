'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, UserCircle, CheckCircle2, XCircle, Building2, TrendingUp, Mail, Phone } from 'lucide-react';
import { ownersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

export default function OwnersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['owners', search],
    queryFn: () => ownersApi.list({ search }),
    staleTime: 60 * 1000,
  });

  const owners = (data as any)?.data ?? (data as any) ?? [];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Property Owners</h1>
          <p className="text-sm text-gray-500 mt-0.5">{owners.length} owners registered</p>
        </div>
        <Button asChild>
          <Link href="/owners/new"><Plus className="w-4 h-4 mr-2" />Add Owner</Link>
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search owners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-xs" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {owners.map((owner: any, i: number) => (
            <motion.div key={owner.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/owners/${owner.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-sm font-semibold text-amber-600 dark:text-amber-400 flex-shrink-0">
                      {getInitials(owner.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{owner.fullName}</div>
                      <div className="text-xs text-gray-500">{owner.nationality ?? 'Owner'}</div>
                    </div>
                    <Badge variant={owner.kycVerified ? 'success' : 'warning'} className="text-xs flex-shrink-0">
                      {owner.kycVerified ? 'KYC ✓' : 'KYC Pending'}
                    </Badge>
                  </div>

                  {/* Contact info */}
                  {(owner.phone || owner.email) && (
                    <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                      {owner.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{owner.phone}</span>}
                      {owner.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{owner.email}</span>}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <div className="text-base font-bold text-gray-900 dark:text-white">{owner._count?.properties ?? 0}</div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Building2 className="w-3 h-3" />Props</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <div className="text-base font-bold text-amber-600">{owner.mgmtFeePct ?? 5}%</div>
                      <div className="text-xs text-gray-500">Mgmt Fee</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <div className="text-base font-bold text-green-600">
                        {owner.properties?.reduce((s: number, p: any) => s + (p.units?.filter((u: any) => u.occupancyStatus === 'OCCUPIED').length ?? 0), 0) ?? 0}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" />Leased</div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
