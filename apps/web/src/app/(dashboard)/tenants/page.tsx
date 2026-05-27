'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Users, CheckCircle2, XCircle, Phone, Clock, AlertTriangle, Filter, Globe, ShieldCheck, CalendarX, TrendingUp } from 'lucide-react';
import { tenantsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

type KycFilter = 'ALL' | 'VERIFIED' | 'PENDING';
type LeaseFilter = 'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NO_LEASE';

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState<KycFilter>('ALL');
  const [leaseFilter, setLeaseFilter] = useState<LeaseFilter>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search],
    queryFn: () => tenantsApi.list({ search }),
    staleTime: 60 * 1000,
  });

  const tenants: any[] = (data as any)?.data ?? (data as any) ?? [];

  // ── Compute KPI metrics ────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = tenants.length;
    const verified = tenants.filter(t => t.kycVerified).length;
    const pending = total - verified;

    let activeLeases = 0;
    let expiringSoon = 0;   // within 90 days
    let expired = 0;
    let avgRent = 0;
    let totalRent = 0;
    let withLease = 0;

    const now = Date.now();
    for (const t of tenants) {
      const lease = t.leases?.[0];
      if (!lease?.endDate) continue;
      withLease++;
      const days = Math.ceil((new Date(lease.endDate).getTime() - now) / 86_400_000);
      if (days < 0) expired++;
      else if (days <= 90) expiringSoon++;
      else activeLeases++;
      if (lease.annualRent) {
        totalRent += Number(lease.annualRent);
      }
    }
    avgRent = withLease > 0 ? Math.round(totalRent / withLease) : 0;

    // Nationality breakdown
    const natMap: Record<string, number> = {};
    for (const t of tenants) {
      const n = t.nationality ?? 'Unknown';
      natMap[n] = (natMap[n] ?? 0) + 1;
    }
    const topNationalities = Object.entries(natMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, verified, pending, activeLeases, expiringSoon, expired, avgRent, totalRent, topNationalities, natMap };
  }, [tenants]);

  // ── Apply filters ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now();
    return tenants.filter((t: any) => {
      // KYC filter
      if (kycFilter === 'VERIFIED' && !t.kycVerified) return false;
      if (kycFilter === 'PENDING'  &&  t.kycVerified) return false;

      // Nationality filter
      if (nationalityFilter !== 'ALL' && (t.nationality ?? 'Unknown') !== nationalityFilter) return false;

      // Lease filter
      if (leaseFilter !== 'ALL') {
        const lease = t.leases?.[0];
        if (leaseFilter === 'NO_LEASE') return !lease;
        if (!lease?.endDate) return false;
        const days = Math.ceil((new Date(lease.endDate).getTime() - now) / 86_400_000);
        if (leaseFilter === 'ACTIVE'   && (days < 0 || days <= 90)) return false;
        if (leaseFilter === 'EXPIRING' && (days < 0 || days > 90))  return false;
        if (leaseFilter === 'EXPIRED'  && days >= 0)                return false;
      }

      return true;
    });
  }, [tenants, kycFilter, leaseFilter, nationalityFilter]);

  const nationalityOptions = Object.keys(kpis.natMap).sort();

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} tenants registered · showing {filtered.length}</p>
        </div>
        <Button asChild>
          <Link href="/tenants/new"><Plus className="w-4 h-4 mr-2" />Add Tenant</Link>
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile
          label="Total"
          value={kpis.total}
          icon={Users}
          color="text-indigo-600"
          bg="bg-indigo-50"
          sub={`${kpis.topNationalities.length} nationalities`}
        />
        <KpiTile
          label="KYC Verified"
          value={kpis.verified}
          icon={ShieldCheck}
          color="text-emerald-600"
          bg="bg-emerald-50"
          sub={`${kpis.total ? Math.round((kpis.verified / kpis.total) * 100) : 0}% complete`}
        />
        <KpiTile
          label="KYC Pending"
          value={kpis.pending}
          icon={XCircle}
          color="text-amber-600"
          bg="bg-amber-50"
          sub={kpis.pending > 0 ? 'Action needed' : 'All clear'}
          onClick={() => setKycFilter('PENDING')}
        />
        <KpiTile
          label="Lease expiring"
          value={kpis.expiringSoon}
          icon={Clock}
          color="text-orange-600"
          bg="bg-orange-50"
          sub="next 90 days"
          onClick={() => setLeaseFilter('EXPIRING')}
        />
        <KpiTile
          label="Lease expired"
          value={kpis.expired}
          icon={CalendarX}
          color="text-red-600"
          bg="bg-red-50"
          sub={kpis.expired > 0 ? 'Renew or terminate' : 'None'}
          onClick={() => setLeaseFilter('EXPIRED')}
        />
        <KpiTile
          label="Avg annual rent"
          value={`AED ${(kpis.avgRent / 1000).toFixed(0)}k`}
          icon={TrendingUp}
          color="text-purple-600"
          bg="bg-purple-50"
          sub={`Total AED ${(kpis.totalRent / 1_000_000).toFixed(1)}M`}
        />
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-400" />

          {/* KYC chips */}
          <FilterChip active={kycFilter === 'ALL'}      onClick={() => setKycFilter('ALL')}      label="All KYC" />
          <FilterChip active={kycFilter === 'VERIFIED'} onClick={() => setKycFilter('VERIFIED')} label={`Verified (${kpis.verified})`} color="emerald" />
          <FilterChip active={kycFilter === 'PENDING'}  onClick={() => setKycFilter('PENDING')}  label={`Pending (${kpis.pending})`}  color="amber" />

          <span className="text-gray-300 mx-1">|</span>

          {/* Lease chips */}
          <FilterChip active={leaseFilter === 'ALL'}      onClick={() => setLeaseFilter('ALL')}      label="All leases" />
          <FilterChip active={leaseFilter === 'ACTIVE'}   onClick={() => setLeaseFilter('ACTIVE')}   label={`Active (${kpis.activeLeases})`} color="emerald" />
          <FilterChip active={leaseFilter === 'EXPIRING'} onClick={() => setLeaseFilter('EXPIRING')} label={`Expiring (${kpis.expiringSoon})`} color="orange" />
          <FilterChip active={leaseFilter === 'EXPIRED'}  onClick={() => setLeaseFilter('EXPIRED')}  label={`Expired (${kpis.expired})`} color="red" />
          <FilterChip active={leaseFilter === 'NO_LEASE'} onClick={() => setLeaseFilter('NO_LEASE')} label="No lease" />

          {/* Nationality dropdown */}
          {nationalityOptions.length > 1 && (
            <>
              <span className="text-gray-300 mx-1">|</span>
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={nationalityFilter}
                onChange={(e) => setNationalityFilter(e.target.value)}
                className="text-xs h-7 px-2 rounded-full border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All nationalities</option>
                {nationalityOptions.map((n) => <option key={n} value={n}>{n} ({kpis.natMap[n]})</option>)}
              </select>
            </>
          )}

          {/* Reset */}
          {(kycFilter !== 'ALL' || leaseFilter !== 'ALL' || nationalityFilter !== 'ALL') && (
            <button
              onClick={() => { setKycFilter('ALL'); setLeaseFilter('ALL'); setNationalityFilter('ALL'); }}
              className="text-[11px] text-gray-500 hover:text-gray-700 underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tenant table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-medium">No tenants match your filters</p>
            <p className="text-xs text-gray-400 mt-1">Try resetting the filters or adjusting search.</p>
          </div>
        </Card>
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
                {filtered.map((tenant: any) => (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {tenant.avatarUrl || tenant.meta?.avatarUrl ? (
                          <img src={tenant.avatarUrl ?? tenant.meta?.avatarUrl} alt={tenant.fullName} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {getInitials(tenant.fullName)}
                          </div>
                        )}
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

// ───────────────────────── Components ─────────────────────────

function KpiTile({
  label, value, icon: Icon, color, bg, sub, onClick,
}: { label: string; value: string | number; icon: any; color: string; bg: string; sub?: string; onClick?: () => void; }) {
  const clickable = !!onClick;
  return (
    <Card
      className={`border-0 shadow-sm ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between">
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-2">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active, onClick, label, color = 'amber',
}: { active: boolean; onClick: () => void; label: string; color?: 'amber' | 'emerald' | 'orange' | 'red' | 'blue'; }) {
  const activeColors: Record<string, string> = {
    amber:   'bg-amber-600 text-white border-amber-600',
    emerald: 'bg-emerald-600 text-white border-emerald-600',
    orange:  'bg-orange-600 text-white border-orange-600',
    red:     'bg-red-600 text-white border-red-600',
    blue:    'bg-blue-600 text-white border-blue-600',
  };
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full font-medium border transition-colors ${
        active
          ? activeColors[color]
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
