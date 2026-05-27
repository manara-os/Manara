'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { tenantsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDownloadButton } from '@/components/report-download-button';
import { SendMessageButton } from '@/components/communications/send-message-button';
import { AICallButton } from '@/components/ai/ai-call-button';
import { AISuggestions } from '@/components/ai/ai-suggestions';
import { TenantScreeningButton } from '@/components/tenants/tenant-screening';
import { AecbCreditReporting } from '@/components/tenants/aecb-credit-reporting';
import { WhatsAppThread } from '@/components/communications/whatsapp-thread';
import { useState } from 'react';
import { Building2, Home, FileText, ChevronRight } from 'lucide-react';

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.getOne(id),
    enabled: !!id,
  });

  const { data: ledgerData } = useQuery({
    queryKey: ['tenant-ledger', id],
    queryFn: () => tenantsApi.getLedger(id),
    enabled: !!id,
  });

  const verifyKycMutation = useMutation({
    mutationFn: () => tenantsApi.verifyKyc(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant', id] }),
  });

  const screeningMutation = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED') => tenantsApi.updateScreening(id, status),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['tenant', id] });
      toast.success(`Screening ${status === 'APPROVED' ? 'approved' : 'rejected'}`);
    },
    onError: () => toast.error('Failed to update screening'),
  });

  const tenant: any = (data as any)?.data ?? data;
  const ledger: any = (ledgerData as any)?.data ?? ledgerData;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      </div>
    );
  }

  if (!tenant) return <div className="p-6 text-gray-500">Tenant not found.</div>;

  const initials = tenant.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'T';

  const activeLease = tenant.leases?.find((l: any) => l.status === 'ACTIVE');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 self-start mt-1">←</button>
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{tenant.fullName}</h1>
              <Badge variant={tenant.kycVerified ? 'success' : 'warning'}>
                {tenant.kycVerified ? 'KYC Verified' : 'KYC Pending'}
              </Badge>
              <Badge variant={tenant.screeningStatus === 'APPROVED' ? 'success' : tenant.screeningStatus === 'REJECTED' ? 'destructive' : 'secondary'}>
                Screening: {tenant.screeningStatus ?? 'PENDING'}
              </Badge>
            </div>
            <p className="text-gray-500">{tenant.phone} · {tenant.email ?? '—'}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <TenantScreeningButton tenantId={id} tenantName={tenant.fullName} />
          <AICallButton
            recipientType="tenant"
            recipientId={id}
            recipientName={tenant.fullName}
          />
          <SendMessageButton
            recipientType="tenant"
            recipientId={id}
            recipientName={tenant.fullName}
            defaultChannel="WHATSAPP"
            label="WhatsApp"
          />
          <SendMessageButton
            recipientType="tenant"
            recipientId={id}
            recipientName={tenant.fullName}
            defaultChannel="EMAIL"
            label="Email"
          />
          <ReportDownloadButton
            entityType="tenant"
            entityId={id}
            entityName={tenant.fullName}
            fetchStatement={(start, end) => tenantsApi.getStatement(id, start, end)}
          />
          {!tenant.kycVerified && (
            <Button
              variant="outline" size="sm"
              onClick={() => verifyKycMutation.mutate()}
              disabled={verifyKycMutation.isPending}
            >
              Verify KYC
            </Button>
          )}
          {tenant.screeningStatus === 'PENDING' && (
            <>
              <Button
                variant="outline" size="sm"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => screeningMutation.mutate('APPROVED')}
                disabled={screeningMutation.isPending}
              >
                Approve Screening
              </Button>
              <Button
                variant="outline" size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => screeningMutation.mutate('REJECTED')}
                disabled={screeningMutation.isPending}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* AI Suggestions for this tenant */}
      <AISuggestions surface="tenant" entityId={id} />

      {/* Active Lease Banner — fully clickable into related entities */}
      {activeLease && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <Link
                href={`/units/${activeLease.unit?.id ?? activeLease.unitId}`}
                className="group flex items-center gap-2"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">Unit</p>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-700 group-hover:underline">
                    {activeLease.unit?.unitNumber}
                  </p>
                </div>
              </Link>

              <Link
                href={`/properties/${activeLease.unit?.property?.id ?? activeLease.unit?.propertyId}`}
                className="group flex items-center gap-2"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">Property</p>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-700 group-hover:underline truncate">
                    {activeLease.unit?.property?.name}
                  </p>
                </div>
              </Link>

              <div>
                <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">Period</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(activeLease.startDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-amber-700">
                  → {new Date(activeLease.endDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3">
                <div className="text-right">
                  <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">Annual rent</p>
                  <p className="font-bold text-amber-900">AED {Number(activeLease.annualRent).toLocaleString()}</p>
                </div>
                <Link
                  href={`/leases/${activeLease.id}`}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Open lease
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AECB Credit Reporting opt-in — build credit with on-time rent */}
      <AecbCreditReporting tenantName={tenant.fullName} tenantId={id} />

      {/* WhatsApp 2-way thread with AI agent in the loop */}
      <WhatsAppThread recipientType="tenant" recipientId={id} recipientName={tenant.fullName} recipientPhone={tenant.phone} />

      {/* All leases history — if more than one */}
      {tenant.leases && tenant.leases.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              Lease history ({tenant.leases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium text-xs uppercase">Property · Unit</th>
                  <th className="pb-2 font-medium text-xs uppercase">Period</th>
                  <th className="pb-2 font-medium text-xs uppercase">Annual Rent</th>
                  <th className="pb-2 font-medium text-xs uppercase">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenant.leases.map((l: any) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="py-2.5">
                      <Link href={`/units/${l.unit?.id ?? l.unitId}`} className="text-amber-600 hover:underline font-medium">
                        {l.unit?.property?.name} · {l.unit?.unitNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 text-gray-600 text-xs">
                      {new Date(l.startDate).toLocaleDateString('en-AE')} → {new Date(l.endDate).toLocaleDateString('en-AE')}
                    </td>
                    <td className="py-2.5 font-medium text-gray-900">AED {Number(l.annualRent).toLocaleString()}</td>
                    <td className="py-2.5">
                      <Badge variant={l.status === 'ACTIVE' ? 'success' : 'secondary'}>{l.status}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/leases/${l.id}`} className="text-xs text-amber-600 hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Nationality', tenant.nationality ?? '—'],
              ['Emirates ID', tenant.emiratesId ?? '—'],
              ['Passport No.', tenant.passportNo ?? '—'],
              ['Email', tenant.email ?? '—'],
              ['Phone', tenant.phone],
              ['KYC Verified', tenant.kycVerified ? `Yes — ${new Date(tenant.kycVerifiedAt).toLocaleDateString('en-AE')}` : 'No'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
          <CardContent>
            {ledger ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Collections</span>
                  <span className="font-medium">{ledger.collections?.length ?? 0} payments</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">PDC Cheques</span>
                  <span className="font-medium">{ledger.cheques?.length ?? 0} cheques</span>
                </div>
                {ledger.cheques?.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Cleared</span>
                    <span className="font-medium text-amber-600">
                      {ledger.cheques.filter((c: any) => c.status === 'CLEARED').length}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Loading ledger...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PDC Cheques Table */}
      {ledger?.cheques?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">PDC Cheques</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Due Date</th>
                  <th className="pb-2 font-medium">Cheque No.</th>
                  <th className="pb-2 font-medium">Bank</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ledger.cheques.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">AED {Number(c.amount).toLocaleString()}</td>
                    <td className="py-2 text-gray-600">{new Date(c.dueDate).toLocaleDateString('en-AE')}</td>
                    <td className="py-2 text-gray-400 font-mono text-xs">{c.chequeNumber ?? '—'}</td>
                    <td className="py-2 text-gray-500 text-xs">{c.bankName ?? '—'}</td>
                    <td className="py-2">
                      <Badge variant={c.status === 'CLEARED' ? 'success' : c.status === 'BOUNCED' ? 'destructive' : 'warning'}>
                        {c.status}
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
