'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/api';
import { AlertOctagon, Phone, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function OverduePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['overdue-list'],
    queryFn: () => financeApi.getOverdue(),
  });

  const rawItems: any[] = (data as any)?.data ?? data ?? [];

  // Compute daysOverdue from dueDate
  const now = Date.now();
  const items = rawItems.map((i) => ({
    ...i,
    daysOverdue: i.dueDate ? Math.max(0, Math.floor((now - new Date(i.dueDate).getTime()) / 86_400_000)) : (i.daysOverdue ?? 0),
    tenantName: i.lease?.tenant?.fullName ?? i.tenantName ?? '—',
    tenantPhone: i.lease?.tenant?.phone ?? i.tenantPhone ?? '—',
    unitNumber: i.lease?.unit?.unitNumber ?? i.unitNumber ?? '—',
    propertyName: i.lease?.unit?.property?.name ?? '',
  }));

  const totalAmount = items.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
  const buckets = {
    '1-10':  items.filter((i) => i.daysOverdue >= 1  && i.daysOverdue <= 10).length,
    '11-20': items.filter((i) => i.daysOverdue >= 11 && i.daysOverdue <= 20).length,
    '21-30': items.filter((i) => i.daysOverdue >= 21 && i.daysOverdue <= 30).length,
    '30+':   items.filter((i) => i.daysOverdue > 30).length,
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertOctagon className="w-7 h-7 text-red-500" />
            Overdue Rent
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tenants whose rent payment is past due. Contact them via WhatsApp, email, or phone to recover. Escalation auto-fires after 7 days.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <p className="text-xs text-red-700 uppercase tracking-wide font-semibold">Total overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">AED {totalAmount.toLocaleString()}</p>
            <p className="text-xs text-red-500 mt-1">{items.length} {items.length === 1 ? 'tenant' : 'tenants'}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">1–10 days</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{buckets['1-10']}</p>
            <p className="text-xs text-amber-600 mt-1">Reminder stage</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">11–20 days</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{buckets['11-20']}</p>
            <p className="text-xs text-orange-600 mt-1">Escalation 1</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">21–30 days</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{buckets['21-30']}</p>
            <p className="text-xs text-red-500 mt-1">Escalation 2</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">30+ days</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{buckets['30+']}</p>
            <p className="text-xs text-red-700 mt-1">Legal review</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Overdue tenants</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success('WhatsApp reminder sent to all overdue tenants (mocked)')}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Send WhatsApp blast
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">✅</div>
              <p className="text-sm text-gray-600 font-medium">No overdue rent</p>
              <p className="text-xs text-gray-400 mt-1">All tenants are paid up.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-5 py-2 font-medium text-xs uppercase">Tenant</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Unit · Property</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Amount</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Due</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Days</th>
                  <th className="px-5 py-2 font-medium text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item: any) => {
                  const days = item.daysOverdue ?? 0;
                  const bucketColor =
                    days <= 10 ? 'bg-amber-100 text-amber-700' :
                    days <= 20 ? 'bg-orange-100 text-orange-700' :
                    days <= 30 ? 'bg-red-100 text-red-700' :
                    'bg-red-200 text-red-900';
                  const tenant = item.lease?.tenant ?? item.tenant ?? {};
                  const unit = item.lease?.unit ?? item.unit ?? {};
                  const property = unit.property ?? {};
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link href={`/tenants/${item.lease?.tenantId ?? tenant.id ?? ''}`} className="text-amber-600 hover:underline font-medium">
                          {tenant.fullName ?? 'Unknown'}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">{tenant.phone}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {unit.unitNumber && (
                          <Link href={`/units/${unit.id ?? ''}`} className="text-amber-600 hover:underline">
                            {unit.unitNumber}
                          </Link>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{property.name}</p>
                      </td>
                      <td className="px-5 py-3 font-semibold text-red-600">
                        AED {Number(item.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${bucketColor}`}>
                          {days}d
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => toast.success(`WhatsApp reminder sent to ${tenant.fullName}`)}
                            className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600"
                            title="Send WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toast.success(`Email reminder sent to ${tenant.fullName}`)}
                            className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                            title="Send email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`tel:${tenant.phone}`}
                            className="p-1.5 rounded hover:bg-amber-100 text-amber-600"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
