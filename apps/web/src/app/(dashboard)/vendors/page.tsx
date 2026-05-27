'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Briefcase, Star, Phone } from 'lucide-react';
import { vendorsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { VendorLeaderboard } from '@/components/vendors/vendor-leaderboard';

const CATEGORY_COLORS: Record<string, string> = {
  PLUMBING: 'bg-blue-100 text-blue-700',
  ELECTRICAL: 'bg-yellow-100 text-yellow-700',
  AC: 'bg-cyan-100 text-cyan-700',
  PAINTING: 'bg-pink-100 text-pink-700',
  PEST_CONTROL: 'bg-green-100 text-green-700',
  CLEANING: 'bg-amber-100 text-amber-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

export default function VendorsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => vendorsApi.list({ search }),
    staleTime: 60 * 1000,
  });

  const vendors = (data as any)?.data ?? (data as any) ?? [];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vendors.length} vendors in network</p>
        </div>
        <Button asChild>
          <Link href="/vendors/new"><Plus className="w-4 h-4 mr-2" />Add Vendor</Link>
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-xs" />
      </div>

      {/* Vendor performance leaderboard — top of page */}
      <div className="mb-5">
        <VendorLeaderboard />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor: any, i: number) => (
            <motion.div key={vendor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/vendors/${vendor.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">{vendor.companyName}</div>
                      <div className="text-xs text-gray-500">{vendor.contactName}</div>
                    </div>
                    <Badge variant={vendor.isApproved ? 'success' : 'warning'} className="text-xs flex-shrink-0">
                      {vendor.isApproved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <Phone className="w-3.5 h-3.5" />{vendor.phone}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {vendor.serviceCategories?.slice(0, 3).map((cat: string) => (
                      <span key={cat} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                        {cat.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-500">{vendor._count?.tickets ?? 0} tickets assigned</span>
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
