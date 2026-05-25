'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leasesApi, integrationsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Clock, ArrowRight, Home, Wrench, FileCheck } from 'lucide-react';

const STATUS_COLORS: Record<string, any> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  EXPIRED: 'secondary',
  TERMINATED: 'destructive',
};

const MOVE_IN_STEPS = [
  { status: 'PENDING', label: 'Pending', icon: Clock, desc: 'Awaiting handover' },
  { status: 'ONGOING', label: 'Ongoing', icon: Home, desc: 'Handover in progress' },
  { status: 'COMPLETE', label: 'Complete', icon: CheckCircle2, desc: 'Move-in done' },
];

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function MoveInStepper({ lease, onUpdate, isPending }: { lease: any; onUpdate: (s: string) => void; isPending: boolean }) {
  const current = lease.moveInStatus || 'PENDING';
  const idx = MOVE_IN_STEPS.findIndex(s => s.status === current);

  const nextStep = MOVE_IN_STEPS[idx + 1];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="w-4 h-4" /> Move-In Status</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          {MOVE_IN_STEPS.map((step, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={step.status} className="flex items-center gap-2 flex-1">
                <div className={`flex flex-col items-center gap-1 flex-1 ${active ? 'text-amber-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${active ? 'border-amber-600 bg-amber-50' : done ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-medium">{step.label}</span>
                </div>
                {i < MOVE_IN_STEPS.length - 1 && (
                  <ArrowRight className={`w-4 h-4 flex-shrink-0 ${done ? 'text-green-400' : 'text-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        {nextStep && (
          <Button
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            disabled={isPending}
            onClick={() => onUpdate(nextStep.status)}
          >
            {isPending ? 'Updating...' : `Advance to ${nextStep.label}`}
          </Button>
        )}
        {current === 'COMPLETE' && (
          <p className="text-xs text-green-600 text-center font-medium mt-1">Move-in complete — renewal alerts scheduled</p>
        )}
      </CardContent>
    </Card>
  );
}

function CommissionCard({ lease, onSubmit, onVerify, isSubmitting, isVerifying }: any) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const hasCommission = !!lease.commissionAmount;
  const isPendingVerif = lease.commissionStatus === 'PENDING_VERIFICATION';
  const isVerified = lease.commissionStatus === 'VERIFIED';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="w-4 h-4" /> Commission
          {hasCommission && (
            <Badge variant={isVerified ? 'success' : 'warning'} className="ml-auto text-[10px]">
              {lease.commissionStatus?.replace('_', ' ')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {hasCommission ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="font-bold">AED {Number(lease.commissionAmount).toLocaleString()}</span>
            </div>
            {isPendingVerif && (
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isVerifying}
                onClick={onVerify}
              >
                {isVerifying ? 'Verifying...' : 'Verify Commission'}
              </Button>
            )}
            {isVerified && <p className="text-xs text-green-600 text-center font-medium">Commission verified</p>}
          </>
        ) : showForm ? (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Commission Amount (AED)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="h-8 text-sm mt-1" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                size="sm"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!amount || isSubmitting}
                onClick={() => { onSubmit({ amount: Number(amount), notes }); setShowForm(false); }}
              >
                Submit
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            Submit Commission
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MoveOutCard({ lease, onCreateMoveOut, onUpdateMoveOut, isCreating, isUpdating }: any) {
  const inspection = lease.moveOutInspection;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ maintenanceRequired: false, maintenanceAmount: '', utilityBillsSubmitted: false, notes: '' });

  if (lease.status !== 'ACTIVE' && lease.status !== 'TERMINATED' && !inspection) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="w-4 h-4" /> Move-Out Inspection
          {inspection && (
            <Badge variant={inspection.status === 'COMPLETE' ? 'success' : 'warning'} className="ml-auto text-[10px]">
              {inspection.status}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        {inspection ? (
          <>
            <div className="flex justify-between"><span className="text-gray-400">Maintenance Required</span><span className="font-medium">{inspection.maintenanceRequired ? 'Yes' : 'No'}</span></div>
            {inspection.maintenanceAmount && <div className="flex justify-between"><span className="text-gray-400">Maintenance Amount</span><span className="font-medium">AED {Number(inspection.maintenanceAmount).toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-gray-400">Utility Bills</span><span className="font-medium">{inspection.utilityBillsSubmitted ? 'Submitted' : 'Pending'}</span></div>
            {inspection.status !== 'COMPLETE' && (
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline" className="flex-1"
                  disabled={isUpdating}
                  onClick={() => onUpdateMoveOut({ status: 'SETTLED', refundApproved: true, utilityBillsSubmitted: true })}
                >Settle</Button>
                <Button
                  size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isUpdating}
                  onClick={() => onUpdateMoveOut({ status: 'COMPLETE' })}
                >Mark Complete</Button>
              </div>
            )}
          </>
        ) : showForm ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.maintenanceRequired} onChange={e => setForm(f => ({ ...f, maintenanceRequired: e.target.checked }))} />
              Maintenance Required
            </label>
            {form.maintenanceRequired && (
              <Input
                type="number" placeholder="Maintenance Amount (AED)"
                value={form.maintenanceAmount}
                onChange={e => setForm(f => ({ ...f, maintenanceAmount: e.target.value }))}
                className="h-8 text-sm"
              />
            )}
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.utilityBillsSubmitted} onChange={e => setForm(f => ({ ...f, utilityBillsSubmitted: e.target.checked }))} />
              Utility Bills Submitted
            </label>
            <Input placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-sm" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isCreating}
                onClick={() => { onCreateMoveOut({ ...form, maintenanceAmount: form.maintenanceAmount ? Number(form.maintenanceAmount) : undefined }); setShowForm(false); }}
              >Create Inspection</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            Start Move-Out Inspection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => leasesApi.getOne(id),
    enabled: !!id,
  });

  const { data: reraData } = useQuery({
    queryKey: ['rera-analysis', id],
    queryFn: () => leasesApi.reraAnalysis(id),
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lease', id] });

  const ejariMutation = useMutation({
    mutationFn: () => integrationsApi.registerEjari(id),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to register Ejari'),
  });

  const terminateMutation = useMutation({
    mutationFn: () => leasesApi.terminate(id, { reason: 'Terminated by PM' }),
    onSuccess: () => { invalidate(); router.back(); },
    onError: () => toast.error('Failed to terminate lease'),
  });

  const renewMutation = useMutation({
    mutationFn: (renewData: { startDate: Date; endDate: Date; annualRent: any }) =>
      leasesApi.renew(id, renewData),
    onSuccess: (res: any) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['leases'] });
      const newId = (res as any)?.data?.id ?? (res as any)?.id;
      if (newId) router.push(`/leases/${newId}`);
    },
    onError: () => toast.error('Failed to initiate renewal'),
  });

  const moveInMutation = useMutation({
    mutationFn: (status: string) => leasesApi.updateMoveInStatus(id, status),
    onSuccess: () => { invalidate(); toast.success('Move-in status updated'); },
    onError: () => toast.error('Failed to update move-in status'),
  });

  const commissionSubmitMutation = useMutation({
    mutationFn: (data: any) => leasesApi.submitCommission(id, data),
    onSuccess: () => { invalidate(); toast.success('Commission submitted'); },
    onError: () => toast.error('Failed to submit commission'),
  });

  const commissionVerifyMutation = useMutation({
    mutationFn: () => leasesApi.verifyCommission(id),
    onSuccess: () => { invalidate(); toast.success('Commission verified'); },
    onError: () => toast.error('Failed to verify commission'),
  });

  const createMoveOutMutation = useMutation({
    mutationFn: (data: any) => leasesApi.createMoveOut(id, data),
    onSuccess: () => { invalidate(); toast.success('Move-out inspection created'); },
    onError: () => toast.error('Failed to create move-out inspection'),
  });

  const updateMoveOutMutation = useMutation({
    mutationFn: (data: any) => leasesApi.updateMoveOut(id, data),
    onSuccess: () => { invalidate(); toast.success('Move-out inspection updated'); },
    onError: () => toast.error('Failed to update move-out inspection'),
  });

  const lease: any = (data as any)?.data ?? data;
  const rera: any = (reraData as any)?.data ?? reraData;

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  if (!lease) return <div className="p-6 text-gray-500">Lease not found.</div>;

  const daysRemaining = daysUntil(lease.endDate);
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 90;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back to Leases</button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">
              {lease.tenant?.fullName} — {lease.unit?.unitNumber}
            </h1>
            <Badge variant={STATUS_COLORS[lease.status] ?? 'secondary'}>{lease.status}</Badge>
            {lease.leaseRef && <span className="text-xs text-gray-400 font-mono">{lease.leaseRef}</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1">{lease.unit?.property?.name} · {lease.ejariNumber ?? 'Ejari Pending'}</p>
        </div>
        <div className="flex gap-2">
          {lease.status === 'ACTIVE' && !lease.ejariNumber && (
            <Button size="sm" variant="outline" onClick={() => ejariMutation.mutate()} disabled={ejariMutation.isPending}>
              {ejariMutation.isPending ? 'Registering...' : 'Register Ejari'}
            </Button>
          )}
          {lease.status === 'ACTIVE' && (
            <Button
              size="sm" variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => confirm('Terminate this lease?') && terminateMutation.mutate()}
              disabled={terminateMutation.isPending}
            >
              Terminate
            </Button>
          )}
        </div>
      </div>

      {/* Expiry Alert */}
      {isExpiringSoon && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-amber-800">Lease Expiring Soon</p>
            <p className="text-sm text-amber-600">Expires in {daysRemaining} days on {new Date(lease.endDate).toLocaleDateString('en-AE')}</p>
          </div>
          <Button
            size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={renewMutation.isPending}
            onClick={() => {
              const endDate = new Date(lease.endDate);
              renewMutation.mutate({
                startDate: new Date(endDate.getTime() + 86400000),
                endDate: new Date(endDate.getTime() + 366 * 86400000),
                annualRent: lease.annualRent,
              });
            }}
          >
            {renewMutation.isPending ? 'Processing...' : 'Initiate Renewal'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — lease terms */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Lease Terms</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Tenant', lease.tenant?.fullName],
                ['Unit', `${lease.unit?.unitNumber} — ${lease.unit?.property?.name}`],
                ['Start Date', new Date(lease.startDate).toLocaleDateString('en-AE')],
                ['End Date', new Date(lease.endDate).toLocaleDateString('en-AE')],
                ['Duration', `${Math.ceil((new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) / (365.25 * 86400000))} year(s)`],
                ['Annual Rent', `AED ${Number(lease.annualRent).toLocaleString()}`],
                ['Monthly Rent', `AED ${Math.round(Number(lease.annualRent) / 12).toLocaleString()}`],
                ['Payment Terms', `${lease.paymentFrequency?.replace(/_/g, ' ')}`],
                ['Security Deposit', lease.securityDeposit ? `AED ${Number(lease.securityDeposit).toLocaleString()}` : '—'],
                ['Screening', lease.screeningApproved ? 'Approved' : 'Pending'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ejari / DLD */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ejari / DLD</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Ejari Number</span>
                <span className={`font-mono text-xs ${lease.ejariNumber ? 'text-amber-600' : 'text-gray-400'}`}>
                  {lease.ejariNumber ?? 'Not Registered'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ejari Status</span>
                <Badge variant={lease.ejariStatus === 'REGISTERED' ? 'success' : 'secondary'}>
                  {lease.ejariStatus ?? 'PENDING'}
                </Badge>
              </div>
              {lease.ejariRegisteredAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Registered On</span>
                  <span className="font-medium">{new Date(lease.ejariRegisteredAt).toLocaleDateString('en-AE')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RERA analysis */}
          {rera && (
            <Card className={rera.maxIncreasePercent > 0 ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}>
              <CardHeader>
                <CardTitle className="text-base text-blue-900">RERA Rent Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-blue-700">Current Rent</span><span className="font-bold">AED {Number(rera.currentRent).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Market Rent</span><span className="font-bold">AED {Number(rera.marketRent).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Gap from Market</span><span className="font-bold">{rera.gapPercent?.toFixed(1)}%</span></div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-blue-800 font-medium">Max Allowed Increase</span>
                  <Badge variant={rera.maxIncreasePercent > 0 ? 'info' : 'success'}>{rera.maxIncreasePercent}%</Badge>
                </div>
                {rera.maxIncreasePercent > 0 && (
                  <p className="text-blue-600 text-xs">Can increase to AED {Number(rera.maxNewRent).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — workflow cards */}
        <div className="space-y-4">
          <MoveInStepper
            lease={lease}
            onUpdate={(status) => moveInMutation.mutate(status)}
            isPending={moveInMutation.isPending}
          />

          <CommissionCard
            lease={lease}
            onSubmit={(data: any) => commissionSubmitMutation.mutate(data)}
            onVerify={() => commissionVerifyMutation.mutate()}
            isSubmitting={commissionSubmitMutation.isPending}
            isVerifying={commissionVerifyMutation.isPending}
          />

          <MoveOutCard
            lease={lease}
            onCreateMoveOut={(data: any) => createMoveOutMutation.mutate(data)}
            onUpdateMoveOut={(data: any) => updateMoveOutMutation.mutate(data)}
            isCreating={createMoveOutMutation.isPending}
            isUpdating={updateMoveOutMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
