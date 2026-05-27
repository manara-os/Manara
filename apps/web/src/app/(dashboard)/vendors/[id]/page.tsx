'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { vendorsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Mail, Star, CheckCircle2, Clock, Wrench, Briefcase, MapPin } from 'lucide-react';
import { AICallButton } from '@/components/ai/ai-call-button';
import { VendorWallet } from '@/components/vendors/vendor-wallet';
import { WhatsAppThread } from '@/components/communications/whatsapp-thread';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  PLUMBING: 'bg-blue-100 text-blue-700',
  ELECTRICAL: 'bg-yellow-100 text-yellow-700',
  AC_HVAC: 'bg-cyan-100 text-cyan-700',
  PAINTING: 'bg-pink-100 text-pink-700',
  PEST_CONTROL: 'bg-green-100 text-green-700',
  CLEANING: 'bg-amber-100 text-amber-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorsApi.get(id),
    enabled: !!id,
  });

  const { data: perfData } = useQuery({
    queryKey: ['vendor-performance', id],
    queryFn: () => vendorsApi.get(id),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => vendorsApi.update(id, { isApproved: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor approved');
    },
    onError: () => toast.error('Failed to approve vendor'),
  });

  const vendor: any = (data as any)?.data ?? data;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      </div>
    );
  }

  if (!vendor) return <div className="p-6 text-gray-500">Vendor not found.</div>;

  const initials = vendor.companyName?.slice(0, 2).toUpperCase() ?? 'VE';

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">←</button>
          <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{vendor.companyName}</h1>
              <Badge variant={vendor.isApproved ? 'success' : 'warning'}>
                {vendor.isApproved ? 'Approved' : 'Pending Approval'}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{vendor.contactName}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              {vendor.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{vendor.phone}</span>}
              {vendor.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{vendor.email}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <AICallButton
            recipientType="vendor"
            recipientId={vendor.id}
            recipientName={vendor.companyName}
          />
          {!vendor.isApproved && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Approve Vendor
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Jobs', value: vendor._count?.tickets ?? 0, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Active Jobs', value: vendor._count?.activeTickets ?? 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: vendor._count?.completedTickets ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Rating', value: vendor.avgRating ? `${Number(vendor.avgRating).toFixed(1)}★` : 'N/A', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Company Details</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {[
              ['Status', vendor.status?.replace(/_/g, ' ') ?? 'ACTIVE'],
              ['Trade License', vendor.tradeLicenseNo ?? '—'],
              ['License Expiry', vendor.tradeLicenseExpiry ? new Date(vendor.tradeLicenseExpiry).toLocaleDateString('en-AE') : '—'],
              ['Approved', vendor.isApproved ? 'Yes' : 'No'],
              ['Member Since', vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('en-AE') : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Categories & Coverage */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Services & Coverage</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Service Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {(vendor.serviceCategories ?? []).map((cat: string) => (
                  <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                    {cat.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Coverage Areas</p>
              <div className="flex flex-wrap gap-1.5">
                {(vendor.coverageAreas ?? []).map((area: string) => (
                  <span key={area} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3" />{area}
                  </span>
                ))}
                {(vendor.coverageAreas ?? []).length === 0 && (
                  <span className="text-xs text-gray-400">No areas specified</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      {/* Vendor Wallet — earnings, payout schedule */}
      <VendorWallet vendor={vendor} />

      {/* WhatsApp 2-way thread */}
      <WhatsAppThread recipientType="vendor" recipientName={vendor.companyName} recipientPhone={vendor.phone} />

      {vendor.tickets?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Recent Jobs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-4 py-2 text-xs font-medium uppercase">Ref</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase">Title</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase">Unit</th>
                  <th className="px-4 py-2 text-xs font-medium uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendor.tickets.slice(0, 10).map((t: any) => (
                  <tr
                    key={t.id}
                    className="hover:bg-amber-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/tickets/${t.id}`)}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.ticketRef}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">{t.title}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {t.unit ? (
                        <Link
                          href={`/units/${t.unit.id ?? t.unitId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-amber-600 hover:underline"
                        >
                          {t.unit.unitNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'OPEN' ? 'warning' : 'secondary'} className="text-xs">
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
