'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownersApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDownloadButton } from '@/components/report-download-button';
import { SendMessageButton } from '@/components/communications/send-message-button';
import { AICallButton } from '@/components/ai/ai-call-button';
import { PmaSigningPipeline } from '@/components/owners/pma-signing-pipeline';
import { InvestorDashboard } from '@/components/owners/investor-dashboard';
import { MarketIntel } from '@/components/owners/market-intel';
import { AISuggestions } from '@/components/ai/ai-suggestions';
import { WhatsAppThread } from '@/components/communications/whatsapp-thread';
import { Building2, TrendingUp, Home, Phone, Mail, Shield, Percent, CalendarRange } from 'lucide-react';
import Link from 'next/link';

export default function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['owner', id],
    queryFn: () => ownersApi.get(id),
    enabled: !!id,
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['owner-portfolio', id],
    queryFn: () => ownersApi.getPortfolioById(id),
    enabled: !!id,
  });

  const verifyKycMutation = useMutation({
    mutationFn: () => ownersApi.update(id, { kycVerified: true, kycVerifiedAt: new Date() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner', id] }),
  });

  const pmaMutation = useMutation({
    mutationFn: (status: string) => ownersApi.updatePmaStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner', id] }); toast.success('PMA status updated'); },
    onError: () => toast.error('Failed to update PMA status'),
  });

  const pmaRenewalMutation = useMutation({
    mutationFn: () => ownersApi.triggerPmaRenewal(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner', id] }); toast.success('PMA renewal initiated'); },
    onError: () => toast.error('Failed to trigger PMA renewal'),
  });

  const owner: any = (data as any)?.data ?? data;
  const portfolio: any = (portfolioData as any)?.data ?? portfolioData;
  const summary = portfolio?.summary;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      </div>
    );
  }

  if (!owner) return <div className="p-6 text-gray-500">Owner not found.</div>;

  const initials = owner.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'OW';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 self-start mt-1">←</button>
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900">{owner.fullName}</h1>
              <Badge variant={owner.kycVerified ? 'success' : 'warning'}>
                {owner.kycVerified ? 'KYC Verified' : 'KYC Pending'}
              </Badge>
              <Badge variant={owner.pmaStatus === 'ACTIVE' ? 'success' : owner.pmaStatus === 'TERMINATED' ? 'destructive' : 'warning'}>
                PMA: {owner.pmaStatus ?? 'ACTIVE'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              {owner.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{owner.phone}</span>}
              {owner.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{owner.email}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0">
          <AICallButton
            recipientType="owner"
            recipientId={id}
            recipientName={owner.fullName}
          />
          <SendMessageButton
            recipientType="owner"
            recipientId={id}
            recipientName={owner.fullName}
            defaultChannel="WHATSAPP"
            label="WhatsApp"
          />
          <SendMessageButton
            recipientType="owner"
            recipientId={id}
            recipientName={owner.fullName}
            defaultChannel="EMAIL"
            label="Email"
          />
          <ReportDownloadButton
            entityType="owner"
            entityId={id}
            entityName={owner.fullName}
            fetchStatement={(start, end) => ownersApi.getStatement(id, start, end)}
          />
          {!owner.kycVerified && (
            <Button variant="outline" size="sm" onClick={() => verifyKycMutation.mutate()} disabled={verifyKycMutation.isPending}>
              Verify KYC
            </Button>
          )}
          {(owner.pmaStatus === 'ACTIVE' || owner.pmaStatus === 'PENDING_RENEWAL') && (
            <Button
              variant="outline" size="sm"
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
              onClick={() => pmaRenewalMutation.mutate()}
              disabled={pmaRenewalMutation.isPending}
            >
              {pmaRenewalMutation.isPending ? 'Processing...' : 'Renew PMA'}
            </Button>
          )}
        </div>
      </div>

      {/* Portfolio Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Properties', value: summary.totalProperties, icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total Units', value: summary.totalUnits, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Occupied', value: `${summary.occupiedUnits}/${summary.totalUnits}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Annual Rent', value: `AED ${Number(summary.totalAnnualRent).toLocaleString()}`, icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((s) => (
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
      )}

      {/* Info + Properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Owner Details</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {[
              ['Nationality', owner.nationality ?? '—'],
              ['Emirates ID', owner.emiratesId ?? '—'],
              ['KYC Type', owner.kycType ?? '—'],
              ['Management Fee', `${owner.mgmtFeePct ?? 5}%`],
              ['PMA Signed', owner.pmaSignedDate ? new Date(owner.pmaSignedDate).toLocaleDateString('en-AE') : '—'],
              ['PMA Expiry', owner.pmaExpiryDate ? new Date(owner.pmaExpiryDate).toLocaleDateString('en-AE') : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Properties</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(owner.properties ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No properties linked</p>
            ) : (
              (owner.properties ?? []).map((prop: any) => {
                const total = prop.units?.length ?? 0;
                const occupied = prop.units?.filter((u: any) => u.occupancyStatus === 'OCCUPIED').length ?? 0;
                const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
                return (
                  <Link key={prop.id} href={`/properties/${prop.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{prop.name}</div>
                          <div className="text-xs text-gray-500">{prop.area}, {prop.city}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</div>
                        <div className="text-xs text-gray-400">{occupied}/{total} units</div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions for this owner */}
      <AISuggestions surface="owner" entityId={id} />

      {/* PMA Signing Pipeline */}
      <PmaSigningPipeline ownerId={id} currentStage={owner.meta?.pmaSigningStage ?? (owner.pmaStatus === 'ACTIVE' ? 'ACTIVE' : 'DRAFT')} />

      {/* Investor Dashboard — asset-level ROI, P&L, YoY, occupancy heat */}
      {portfolio && <InvestorDashboard portfolio={portfolio} />}

      {/* Market Intel — live RERA + Bayut/PF comparables */}
      {portfolio && <MarketIntel portfolio={portfolio} />}

      {/* WhatsApp 2-way thread with AI in the loop */}
      <WhatsAppThread recipientType="owner" recipientName={owner.fullName} recipientPhone={owner.phone} />

      {/* Unit Grid */}
      {(portfolio?.owner?.properties ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Unit Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium text-xs uppercase">Property</th>
                    <th className="pb-2 font-medium text-xs uppercase">Unit</th>
                    <th className="pb-2 font-medium text-xs uppercase">Type</th>
                    <th className="pb-2 font-medium text-xs uppercase">Annual Rent</th>
                    <th className="pb-2 font-medium text-xs uppercase">Tenant</th>
                    <th className="pb-2 font-medium text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(portfolio.owner.properties ?? []).flatMap((prop: any) =>
                    (prop.units ?? []).map((unit: any) => {
                      const lease = unit.leases?.[0];
                      return (
                        <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 text-gray-600 text-xs">
                            <Link href={`/properties/${prop.id}`} className="text-amber-600 hover:underline">
                              {prop.name}
                            </Link>
                          </td>
                          <td className="py-2.5 font-medium text-gray-900">
                            <Link href={`/units/${unit.id}`} className="text-amber-600 hover:underline">
                              {unit.unitNumber}
                            </Link>
                          </td>
                          <td className="py-2.5 text-gray-500 text-xs">{unit.type?.replace('_', ' ')}</td>
                          <td className="py-2.5 text-gray-900">AED {Number(unit.annualRent ?? 0).toLocaleString()}</td>
                          <td className="py-2.5 text-gray-600 text-xs">
                            {lease?.tenant ? (
                              <Link href={`/tenants/${lease.tenantId ?? lease.tenant.id}`} className="text-amber-600 hover:underline font-medium">
                                {lease.tenant.fullName}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              unit.occupancyStatus === 'OCCUPIED' ? 'bg-green-100 text-green-700' :
                              unit.occupancyStatus === 'VACANT' ? 'bg-gray-100 text-gray-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {unit.occupancyStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
