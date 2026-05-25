'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leasesApi, tenantsApi, unitsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, FileText } from 'lucide-react';

export default function NewLeasePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: unitsData } = useQuery({
    queryKey: ['units-vacant'],
    queryFn: () => unitsApi.list({ occupancyStatus: 'VACANT' }),
  });
  const units: any[] = Array.isArray(unitsData) ? unitsData : (unitsData as any)?.data ?? [];

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: () => tenantsApi.list(),
  });
  const tenants: any[] = Array.isArray(tenantsData) ? tenantsData : (tenantsData as any)?.data ?? [];

  const [form, setForm] = useState({
    unitId: '',
    tenantId: '',
    leaseType: 'RESIDENTIAL',
    startDate: '',
    endDate: '',
    annualRent: '',
    paymentFrequency: 'ANNUAL',
    numCheques: '4',
    securityDeposit: '',
    ejariNumber: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => leasesApi.create(data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['leases'] });
      qc.invalidateQueries({ queryKey: ['units'] });
      toast.success('Lease created successfully');
      const id = res?.id ?? res?.data?.id;
      router.push(id ? `/leases/${id}` : '/leases');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to create lease'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unitId || !form.tenantId || !form.startDate || !form.endDate || !form.annualRent) {
      toast.error('Please fill in all required fields');
      return;
    }
    mutation.mutate({
      unitId: form.unitId,
      tenantId: form.tenantId,
      leaseType: form.leaseType,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      annualRent: parseFloat(form.annualRent),
      paymentFrequency: form.paymentFrequency,
      numCheques: parseInt(form.numCheques),
      ...(form.securityDeposit && { securityDeposit: parseFloat(form.securityDeposit) }),
      ...(form.ejariNumber && { ejariNumber: form.ejariNumber }),
      currencyCode: 'AED',
      status: 'ACTIVE',
    });
  };

  // Auto-calculate end date when start date changes (1 year default)
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    setForm(f => ({
      ...f,
      startDate: start,
      endDate: start ? new Date(new Date(start).setFullYear(new Date(start).getFullYear() + 1) - 1).toISOString().split('T')[0] : f.endDate,
    }));
  };

  // Auto-calculate security deposit (1 month)
  const annualRentNum = parseFloat(form.annualRent) || 0;
  const suggestedDeposit = annualRentNum > 0 ? Math.round(annualRentNum / 12) : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
          <FileText className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">New Lease</h1>
          <p className="text-xs text-gray-500">Create a new lease agreement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Parties</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Unit <span className="text-red-500">*</span></Label>
                <select value={form.unitId} onChange={set('unitId')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Select a vacant unit...</option>
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber} — {u.property?.name} ({u.type?.replace(/_/g,' ')})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Tenant <span className="text-red-500">*</span></Label>
                <select value={form.tenantId} onChange={set('tenantId')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Select tenant...</option>
                  {tenants.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.fullName} — {t.phone}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Lease Type</Label>
                <select value={form.leaseType} onChange={set('leaseType')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Lease Terms</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.startDate} onChange={handleStartDateChange} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.endDate} onChange={set('endDate')} />
              </div>
              <div className="space-y-1.5">
                <Label>Annual Rent (AED) <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="75000" min="0" value={form.annualRent} onChange={set('annualRent')} />
              </div>
              <div className="space-y-1.5">
                <Label>Security Deposit (AED)</Label>
                <Input type="number" placeholder={suggestedDeposit > 0 ? String(suggestedDeposit) : '0'} min="0" value={form.securityDeposit} onChange={set('securityDeposit')} />
                {suggestedDeposit > 0 && !form.securityDeposit && (
                  <p className="text-xs text-gray-400">Suggested: AED {suggestedDeposit.toLocaleString()} (1 month)</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Payment Frequency</Label>
                <select value={form.paymentFrequency} onChange={set('paymentFrequency')} className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="SEMI_ANNUAL">Semi-Annual</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Number of Cheques</Label>
                <Input type="number" min="1" max="12" value={form.numCheques} onChange={set('numCheques')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Ejari (Optional)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Ejari Number</Label>
              <Input placeholder="E-XXXXXXXX-XXX" value={form.ejariNumber} onChange={set('ejariNumber')} />
              <p className="text-xs text-gray-400">Leave blank to register Ejari later</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-amber-600 hover:bg-amber-700">
            {mutation.isPending ? 'Creating...' : 'Create Lease'}
          </Button>
        </div>
      </form>
    </div>
  );
}
