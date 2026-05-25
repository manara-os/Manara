'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ticketsApi, vendorsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

const PRIORITY_COLORS = {
  EMERGENCY: 'destructive',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'secondary',
} as const;

const STATUS_FLOW: Record<string, string[]> = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getOne(id),
    enabled: !!id,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => vendorsApi.list(),
  });

  const assignMutation = useMutation({
    mutationFn: (vid: string) => ticketsApi.assign(id, vid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', id] }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => ticketsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets-board'] });
    },
  });

  const ticket: any = (data as any)?.data ?? data;
  const vendors: any[] = Array.isArray(vendorsData) ? (vendorsData as any[]) : ((vendorsData as any)?.data ?? []);
  const approvedVendors = vendors.filter((v) => v.isApproved);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      </div>
    );
  }

  if (!ticket) return <div className="p-6 text-gray-500">Ticket not found.</div>;

  const nextStatuses = STATUS_FLOW[ticket.status] ?? [];
  const isOverSla = ticket.slaDueAt && new Date(ticket.slaDueAt) < new Date() && !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(ticket.status);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
            ← Back to Tickets
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">{ticket.title}</h1>
            <Badge variant={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS] ?? 'secondary'}>
              {ticket.priority}
            </Badge>
            <Badge variant="outline">{ticket.status}</Badge>
            {isOverSla && <Badge variant="destructive">SLA Breached</Badge>}
          </div>
          <p className="text-gray-400 font-mono text-sm mt-1">{ticket.ticketRef}</p>
        </div>
        <div className="flex gap-2">
          {nextStatuses.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === 'COMPLETED' || status === 'CLOSED' ? 'default' : 'outline'}
              onClick={() => statusMutation.mutate(status)}
              disabled={statusMutation.isPending}
            >
              → {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {ticket.description && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm leading-relaxed">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Location</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <Link
                href={`/units/${ticket.unit?.id ?? ticket.unitId}`}
                className="font-medium text-amber-600 hover:underline inline-block"
              >
                Unit {ticket.unit?.unitNumber}
              </Link>
              {ticket.unit?.property && (
                <p>
                  <Link
                    href={`/properties/${ticket.unit.property.id ?? ticket.unit.propertyId}`}
                    className="text-amber-600 hover:underline text-sm"
                  >
                    {ticket.unit.property.name}
                  </Link>
                </p>
              )}
              {ticket.unit?.property?.address && (
                <p className="text-gray-400 text-xs">{ticket.unit.property.address}</p>
              )}
            </CardContent>
          </Card>

          {ticket.resolutionNote && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader><CardTitle className="text-sm font-semibold text-amber-800">Resolution Note</CardTitle></CardHeader>
              <CardContent>
                <p className="text-amber-700 text-sm">{ticket.resolutionNote}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Created', ticket.createdAt],
                ['Assigned', ticket.assignedAt],
                ['SLA Due', ticket.slaDueAt],
                ['Completed', ticket.completedAt],
                ['Closed', ticket.closedAt],
              ].filter(([, v]) => v).map(([label, date]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-400">{label}</span>
                  <span className={`font-medium ${label === 'SLA Due' && isOverSla ? 'text-red-600' : 'text-gray-700'}`}>
                    {new Date(date as string).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ticket.vendor ? (
                <Link href={`/vendors/${ticket.vendor.id ?? ticket.vendorId}`} className="block group">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-amber-600 group-hover:underline">
                    {ticket.vendor.companyName}
                  </p>
                  <p className="text-xs text-gray-400">{ticket.vendor.contactName} · {ticket.vendor.phone}</p>
                </Link>
              ) : (
                <p className="text-sm text-gray-400">Not yet assigned</p>
              )}
              {['OPEN', 'ASSIGNED'].includes(ticket.status) && (
                <div className="space-y-2">
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select vendor...</option>
                    {approvedVendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.companyName}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => vendorId && assignMutation.mutate(vendorId)}
                    disabled={!vendorId || assignMutation.isPending}
                  >
                    {ticket.vendor ? 'Reassign' : 'Assign'} Vendor
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Category</span>
                <span className="font-medium text-gray-700">{ticket.category?.replace(/_/g, ' ') ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reported By</span>
                {ticket.tenant ? (
                  <Link
                    href={`/tenants/${ticket.tenant.id ?? ticket.tenantId}`}
                    className="font-medium text-amber-600 hover:underline"
                  >
                    {ticket.tenant.fullName}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-700">System</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
